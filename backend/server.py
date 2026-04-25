from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Configure logging early so helpers can use it
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app without a prefix
app = FastAPI(title="RealCheck API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
CheckType = Literal["article", "product", "news"]
Verdict = Literal["verified", "suspicious", "unconfirmed"]


class Claim(BaseModel):
    text: str
    verdict: Verdict
    explanation: str


class CategoryScores(BaseModel):
    effectiveness: int = Field(ge=0, le=100)
    safety: int = Field(ge=0, le=100)
    price: int = Field(ge=0, le=100)
    evidence: int = Field(ge=0, le=100)


class WebSource(BaseModel):
    url: str
    title: str = ""


class AnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source_text: str
    check_type: CheckType
    reality_score: int = Field(ge=0, le=100)
    risk_level: Literal["low", "medium", "high"]
    risk_summary: str
    claims_total: int
    claims_verified: int
    claims_suspicious: int
    claims_unconfirmed: int
    claims: List[Claim]
    categories: CategoryScores
    web_context: str = ""
    web_sources: List[WebSource] = Field(default_factory=list)
    is_favorite: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AnalyzeRequest(BaseModel):
    text: str
    check_type: CheckType = "article"
    title: Optional[str] = None


class AnalyzeImageRequest(BaseModel):
    image_base64: str  # raw base64 (no data: prefix)
    check_type: CheckType = "article"
    title: Optional[str] = None


class FavoriteToggle(BaseModel):
    is_favorite: bool


# ---------- Helpers ----------
SYSTEM_PROMPT = """You are RealCheck, an expert fact-checking and claims-analysis assistant. \
The user will provide text content (an article, a product/ad description, or a news item). \
Your job is to analyze the content and detect misleading, exaggerated, unverified, or false claims.

You MUST respond ONLY with valid JSON, no markdown, no commentary. The JSON must match this schema exactly:

{
  "title": "short Bulgarian title summarizing the content (max 80 chars)",
  "reality_score": <integer 0-100, higher = more truthful/realistic>,
  "risk_level": "low" | "medium" | "high",
  "risk_summary": "1-2 sentences in BULGARIAN summarizing the overall risk",
  "claims": [
    {
      "text": "the exact claim or close paraphrase in Bulgarian",
      "verdict": "verified" | "suspicious" | "unconfirmed",
      "explanation": "1-2 sentences in Bulgarian explaining the verdict"
    }
  ],
  "categories": {
    "effectiveness": <integer 0-100>,
    "safety": <integer 0-100>,
    "price": <integer 0-100>,
    "evidence": <integer 0-100>
  }
}

Guidelines:
- Always respond in BULGARIAN for all human-readable strings.
- Extract between 4 and 10 distinct claims.
- "verified" = supported by general knowledge / consensus.
- "suspicious" = likely exaggerated, misleading, or out-of-context.
- "unconfirmed" = no clear evidence either way.
- reality_score: 80+ mostly truthful, 50-79 mixed, below 50 highly misleading.
- risk_level mapping: score>=75 -> "low", 50-74 -> "medium", <50 -> "high".
- categories: rate based on how well the content addresses each (0 = ignored/unclear, 100 = excellent).
- Return ONLY the JSON object."""


def _extract_json(text: str) -> dict:
    """Extract JSON object from LLM response, stripping markdown fences if present."""
    text = text.strip()
    # Remove markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(text[start:end + 1])


WEB_SEARCH_PROMPT = """Ти си изследовател за fact-checking. Получаваш текст (статия, реклама или новина) на български. \
Използвай инструмента google_search, за да намериш актуални и достоверни източници за ключовите твърдения. \
Върни кратко резюме на български (макс 500 думи) с конкретни факти от източниците.

ВАЖНО: В края на резюмето добави секция „ИЗТОЧНИЦИ:" и изброй всеки използван URL на отделен ред във формат:
- https://example.com/page (Заглавие на страницата)

Не давай мнение - само факти от мрежата."""


URL_RE = re.compile(r"https?://[^\s\)\]<>]+", re.IGNORECASE)


def _extract_urls_from_text(text: str) -> list[dict]:
    """Parse markdown-style links and bare URLs from a Gemini search response."""
    sources: list[dict] = []
    seen: set[str] = set()
    # 1) markdown links [title](url)
    for m in re.finditer(r"\[([^\]]+)\]\((https?://[^\s\)]+)\)", text):
        title, url = m.group(1).strip(), m.group(2).strip().rstrip(".,;:")
        if url not in seen:
            seen.add(url)
            sources.append({"url": url, "title": title})
    # 2) bare URLs (often with optional "(Title)" after them)
    for m in re.finditer(r"(https?://[^\s\)\]<>]+)(?:\s*\(([^)]+)\))?", text):
        url = m.group(1).strip().rstrip(".,;:")
        title = (m.group(2) or "").strip()
        if url and url not in seen:
            seen.add(url)
            sources.append({"url": url, "title": title})
    return sources


def gather_web_context(text: str, check_type: str) -> tuple[str, list[dict]]:
    """Use Gemini 3 Pro with google_search grounding via Emergent proxy. Returns (text, sources)."""
    try:
        import litellm
        from emergentintegrations.llm.utils import get_integration_proxy_url

        resp = litellm.completion(
            model="gemini/gemini-3.1-pro-preview",
            messages=[
                {"role": "system", "content": WEB_SEARCH_PROMPT},
                {"role": "user", "content": f"Тип: {check_type}\n\nТекст за проверка:\n\"\"\"\n{text}\n\"\"\""},
            ],
            api_key=EMERGENT_LLM_KEY,
            api_base=get_integration_proxy_url() + "/llm",
            custom_llm_provider="openai",
            tools=[{"googleSearch": {}}],
        )
        out_text = (resp.choices[0].message.content or "").strip()
        sources = _extract_urls_from_text(out_text)
        return out_text, sources
    except Exception as e:
        logger.warning(f"web search failed (non-fatal): {e}")
        return "", []


async def run_analysis(text: str, check_type: str) -> tuple[dict, str, list[dict]]:
    # Stage 1: web search context via OpenAI gpt-5.2
    import anyio
    web_text, web_sources = await anyio.to_thread.run_sync(
        gather_web_context, text, check_type
    )

    # Stage 2: Gemini 3 Pro analysis grounded in web findings
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"realcheck-{uuid.uuid4()}",
        system_message=SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3.1-pro-preview")

    web_block = ""
    if web_text:
        web_block = (
            "\n\nДопълнителен контекст от уеб търсене (Gemini 3 Pro + Google Search). "
            "Използвай го при оценката на твърденията:\n"
            f"\"\"\"\n{web_text}\n\"\"\""
        )

    user_text = (
        f"Тип на съдържанието: {check_type}\n\n"
        f"Съдържание за анализ:\n\"\"\"\n{text}\n\"\"\""
        f"{web_block}"
    )
    response = await chat.send_message(UserMessage(text=user_text))
    return _extract_json(response), web_text, web_sources


IMAGE_EXTRACT_PROMPT = """Ти си помощник за извличане на текст и твърдения от изображение. \
Получаваш снимка (реклама, етикет, скрийншот на новина, статия и т.н.). \
Извлечи целия видим текст от снимката, ВКЛЮЧИТЕЛНО твърдения, числа, проценти, имена на марки и контактна информация. \
Преведи на български, ако е на друг език. Ако в снимката няма текст, опиши какво показва снимката с фокус върху твърдения, които могат да бъдат проверени. \
Върни само извлечения/описан текст, без коментари."""


async def extract_text_from_image(image_b64: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"realcheck-ocr-{uuid.uuid4()}",
        system_message=IMAGE_EXTRACT_PROMPT,
    ).with_model("gemini", "gemini-3.1-pro-preview")

    msg = UserMessage(
        text="Извлечи целия текст и твърдения от тази снимка на български.",
        file_contents=[ImageContent(image_base64=image_b64)],
    )
    return (await chat.send_message(msg) or "").strip()


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "RealCheck API", "status": "ok"}


async def _build_analysis_result(text: str, check_type: str, title_override: Optional[str]) -> AnalysisResult:
    data, web_text, web_sources = await run_analysis(text, check_type)

    claims_raw = data.get("claims", [])
    claims = [Claim(**c) for c in claims_raw]
    counts = {"verified": 0, "suspicious": 0, "unconfirmed": 0}
    for c in claims:
        counts[c.verdict] += 1

    cats = data.get("categories", {})
    categories = CategoryScores(
        effectiveness=int(cats.get("effectiveness", 0)),
        safety=int(cats.get("safety", 0)),
        price=int(cats.get("price", 0)),
        evidence=int(cats.get("evidence", 0)),
    )

    title = title_override or data.get("title") or text[:60].strip() + "…"

    result = AnalysisResult(
        title=title[:120],
        source_text=text,
        check_type=check_type,
        reality_score=int(data.get("reality_score", 0)),
        risk_level=data.get("risk_level", "medium"),
        risk_summary=data.get("risk_summary", ""),
        claims_total=len(claims),
        claims_verified=counts["verified"],
        claims_suspicious=counts["suspicious"],
        claims_unconfirmed=counts["unconfirmed"],
        claims=claims,
        categories=categories,
        web_context=web_text or "",
        web_sources=[WebSource(**s) for s in (web_sources or [])],
    )

    doc = result.model_dump()
    await db.checks.insert_one(doc)
    return result


@api_router.post("/analyze", response_model=AnalysisResult)
async def analyze(req: AnalyzeRequest):
    if not req.text or len(req.text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Текстът трябва да е поне 20 символа.")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY липсва в средата.")

    try:
        return await _build_analysis_result(req.text, req.check_type, req.title)
    except Exception as e:
        logger.exception("LLM analysis failed")
        raise HTTPException(status_code=502, detail=f"AI анализът се провали: {e}")


@api_router.post("/analyze-image", response_model=AnalysisResult)
async def analyze_image(req: AnalyzeImageRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY липсва в средата.")
    # strip optional data: prefix
    img = req.image_base64
    if img.startswith("data:"):
        img = img.split(",", 1)[-1]
    img = img.strip()
    if len(img) < 100:
        raise HTTPException(status_code=400, detail="Невалидна или твърде малка снимка.")

    try:
        extracted = await extract_text_from_image(img)
    except Exception as e:
        logger.exception("image OCR failed")
        raise HTTPException(status_code=502, detail=f"Извличането от снимка се провали: {e}")

    if not extracted or len(extracted.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="Не успях да извлека достатъчно текст от снимката. Опитай с по-ясно изображение.",
        )

    try:
        return await _build_analysis_result(extracted, req.check_type, req.title)
    except Exception as e:
        logger.exception("LLM analysis failed (image)")
        raise HTTPException(status_code=502, detail=f"AI анализът се провали: {e}")


@api_router.get("/checks", response_model=List[AnalysisResult])
async def list_checks(favorites_only: bool = False, limit: int = 100):
    query = {"is_favorite": True} if favorites_only else {}
    docs = await db.checks.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [AnalysisResult(**d) for d in docs]


@api_router.get("/checks/{check_id}", response_model=AnalysisResult)
async def get_check(check_id: str):
    doc = await db.checks.find_one({"id": check_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Проверката не е намерена.")
    return AnalysisResult(**doc)


@api_router.delete("/checks/{check_id}")
async def delete_check(check_id: str):
    res = await db.checks.delete_one({"id": check_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Проверката не е намерена.")
    return {"deleted": True}


@api_router.patch("/checks/{check_id}/favorite", response_model=AnalysisResult)
async def toggle_favorite(check_id: str, body: FavoriteToggle):
    res = await db.checks.find_one_and_update(
        {"id": check_id},
        {"$set": {"is_favorite": body.is_favorite}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Проверката не е намерена.")
    return AnalysisResult(**res)


@api_router.get("/stats")
async def get_stats():
    total = await db.checks.count_documents({})
    favorites = await db.checks.count_documents({"is_favorite": True})

    pipeline = [
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$reality_score"},
            "total_claims": {"$sum": "$claims_total"},
            "total_verified": {"$sum": "$claims_verified"},
            "total_suspicious": {"$sum": "$claims_suspicious"},
            "total_unconfirmed": {"$sum": "$claims_unconfirmed"},
        }}
    ]
    agg = await db.checks.aggregate(pipeline).to_list(1)
    stats = agg[0] if agg else {}

    return {
        "total_checks": total,
        "favorites": favorites,
        "avg_score": round(stats.get("avg_score") or 0, 1),
        "total_claims": stats.get("total_claims", 0),
        "total_verified": stats.get("total_verified", 0),
        "total_suspicious": stats.get("total_suspicious", 0),
        "total_unconfirmed": stats.get("total_unconfirmed", 0),
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
