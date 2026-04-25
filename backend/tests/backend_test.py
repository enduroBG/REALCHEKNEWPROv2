"""Backend API tests for RealCheck.

Covers:
 - Root health
 - POST /api/analyze (article / product / news) with real Gemini call
 - Validation: short text -> 400
 - GET /api/checks, ?favorites_only=true
 - GET /api/checks/{id}, 404 path
 - PATCH /api/checks/{id}/favorite (toggle on/off)
 - DELETE /api/checks/{id}
 - GET /api/stats
 - Verify _id never returned, created_at is ISO string
"""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # frontend env file
    from pathlib import Path
    fe = Path("/app/frontend/.env")
    if fe.exists():
        for line in fe.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
                break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

# Generous timeout for LLM calls
LLM_TIMEOUT = 120
SHORT_TIMEOUT = 30

# Sample Bulgarian texts (>20 chars each)
ARTICLE_TEXT = (
    "Учени твърдят, че пиенето на 3 литра вода дневно увеличава IQ с 20 точки "
    "и предотвратява всички видове рак според неназовано проучване от 2023 г."
)
PRODUCT_TEXT = (
    "Този чудотворен крем премахва бръчките за 24 часа, гарантирано подмладява "
    "кожата с 20 години и съдържа само натурални съставки без химикали."
)
NEWS_TEXT = (
    "Последни новини: правителството обяви, че утре всички данъци ще бъдат намалени "
    "наполовина и пенсиите ще се удвоят без никакви промени в бюджета."
)


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def created_ids():
    return []


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{API}/", timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "ok"
        assert "RealCheck" in data.get("message", "")


# ---------------- Validation ----------------
class TestValidation:
    def test_analyze_too_short_returns_400(self, http):
        r = http.post(f"{API}/analyze", json={"text": "кратък", "check_type": "article"}, timeout=SHORT_TIMEOUT)
        assert r.status_code == 400, r.text
        body = r.json()
        assert "detail" in body

    def test_analyze_invalid_check_type(self, http):
        r = http.post(
            f"{API}/analyze",
            json={"text": ARTICLE_TEXT, "check_type": "invalid_type"},
            timeout=SHORT_TIMEOUT,
        )
        assert r.status_code == 422, r.text


# ---------------- Analyze (real LLM) ----------------
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def _assert_analysis_shape(data):
    # No mongo _id leak
    assert "_id" not in data, f"_id should not be returned: {data.keys()}"
    # Required fields
    for k in [
        "id", "title", "source_text", "check_type",
        "reality_score", "risk_level", "risk_summary",
        "claims_total", "claims_verified", "claims_suspicious", "claims_unconfirmed",
        "claims", "categories", "is_favorite", "created_at",
    ]:
        assert k in data, f"missing field: {k}"
    # Types
    assert isinstance(data["id"], str) and len(data["id"]) > 0
    assert 0 <= data["reality_score"] <= 100
    assert data["risk_level"] in ("low", "medium", "high")
    assert isinstance(data["claims"], list)
    assert data["claims_total"] == len(data["claims"])
    counts = {"verified": 0, "suspicious": 0, "unconfirmed": 0}
    for c in data["claims"]:
        assert c["verdict"] in counts
        counts[c["verdict"]] += 1
    assert data["claims_verified"] == counts["verified"]
    assert data["claims_suspicious"] == counts["suspicious"]
    assert data["claims_unconfirmed"] == counts["unconfirmed"]
    cats = data["categories"]
    for k in ("effectiveness", "safety", "price", "evidence"):
        assert 0 <= cats[k] <= 100
    assert isinstance(data["created_at"], str)
    assert ISO_RE.match(data["created_at"]), f"created_at not ISO: {data['created_at']}"
    assert data["is_favorite"] is False


class TestAnalyze:
    def test_analyze_article(self, http, created_ids):
        r = http.post(
            f"{API}/analyze",
            json={"text": ARTICLE_TEXT, "check_type": "article", "title": "TEST_article"},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _assert_analysis_shape(data)
        assert data["check_type"] == "article"
        assert data["title"] == "TEST_article"
        created_ids.append(data["id"])

    def test_analyze_product(self, http, created_ids):
        r = http.post(
            f"{API}/analyze",
            json={"text": PRODUCT_TEXT, "check_type": "product"},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _assert_analysis_shape(data)
        assert data["check_type"] == "product"
        created_ids.append(data["id"])

    def test_analyze_news(self, http, created_ids):
        r = http.post(
            f"{API}/analyze",
            json={"text": NEWS_TEXT, "check_type": "news"},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _assert_analysis_shape(data)
        assert data["check_type"] == "news"
        created_ids.append(data["id"])


# ---------------- List / Get ----------------
class TestListAndGet:
    def test_list_checks(self, http, created_ids):
        assert created_ids, "no checks created from prior tests"
        r = http.get(f"{API}/checks", timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        ids = [d["id"] for d in data]
        for cid in created_ids:
            assert cid in ids
        # No _id leak
        for d in data:
            assert "_id" not in d
        # Sorted desc by created_at
        if len(data) >= 2:
            ts = [d["created_at"] for d in data]
            assert ts == sorted(ts, reverse=True), "checks not sorted by created_at desc"

    def test_get_check_by_id(self, http, created_ids):
        cid = created_ids[0]
        r = http.get(f"{API}/checks/{cid}", timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == cid
        assert "_id" not in data

    def test_get_check_404(self, http):
        r = http.get(f"{API}/checks/{uuid.uuid4()}", timeout=SHORT_TIMEOUT)
        assert r.status_code == 404


# ---------------- Favorites ----------------
class TestFavorites:
    def test_toggle_favorite_on(self, http, created_ids):
        cid = created_ids[0]
        r = http.patch(f"{API}/checks/{cid}/favorite", json={"is_favorite": True}, timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_favorite"] is True
        assert data["id"] == cid
        assert "_id" not in data

        # Verify persistence via GET
        r2 = http.get(f"{API}/checks/{cid}", timeout=SHORT_TIMEOUT)
        assert r2.status_code == 200
        assert r2.json()["is_favorite"] is True

    def test_favorites_only_filter(self, http, created_ids):
        r = http.get(f"{API}/checks", params={"favorites_only": "true"}, timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        for d in data:
            assert d["is_favorite"] is True
        ids = [d["id"] for d in data]
        assert created_ids[0] in ids

    def test_toggle_favorite_off(self, http, created_ids):
        cid = created_ids[0]
        r = http.patch(f"{API}/checks/{cid}/favorite", json={"is_favorite": False}, timeout=SHORT_TIMEOUT)
        assert r.status_code == 200
        assert r.json()["is_favorite"] is False

    def test_toggle_favorite_404(self, http):
        r = http.patch(f"{API}/checks/{uuid.uuid4()}/favorite", json={"is_favorite": True}, timeout=SHORT_TIMEOUT)
        assert r.status_code == 404


# ---------------- Stats ----------------
class TestStats:
    def test_stats_shape(self, http):
        r = http.get(f"{API}/stats", timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in (
            "total_checks", "favorites", "avg_score",
            "total_claims", "total_verified", "total_suspicious", "total_unconfirmed",
        ):
            assert k in data, f"missing stats field {k}"
        assert isinstance(data["total_checks"], int) and data["total_checks"] >= 1
        assert isinstance(data["favorites"], int) and data["favorites"] >= 0
        assert isinstance(data["avg_score"], (int, float))
        assert 0 <= data["avg_score"] <= 100


# ---------------- Delete (cleanup, runs last) ----------------
class TestZDelete:
    def test_delete_created_checks(self, http, created_ids):
        for cid in list(created_ids):
            r = http.delete(f"{API}/checks/{cid}", timeout=SHORT_TIMEOUT)
            assert r.status_code == 200, r.text
            assert r.json().get("deleted") is True
            # Verify gone
            r2 = http.get(f"{API}/checks/{cid}", timeout=SHORT_TIMEOUT)
            assert r2.status_code == 404
            created_ids.remove(cid)

    def test_delete_404(self, http):
        r = http.delete(f"{API}/checks/{uuid.uuid4()}", timeout=SHORT_TIMEOUT)
        assert r.status_code == 404
