import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  FileText,
  ShoppingBag,
  Newspaper,
  Sparkles,
  Type,
  Image as ImageIcon,
  Camera,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { analyze, analyzeImage } from "@/lib/api";

const TYPES = [
  { id: "article", label: "Статия", desc: "Проверка на статия или текст", icon: FileText },
  { id: "product", label: "Продукт / Реклама", desc: "Преувеличени твърдения за продукт", icon: ShoppingBag },
  { id: "news", label: "Новина", desc: "Fact-checking на новинарска информация", icon: Newspaper },
];

const SAMPLES = {
  article:
    "Новата диета 'Зелена сила' гарантира загуба на 10 кг за две седмици, без диета и без упражнения. Учени от анонимен университет потвърждават, че продуктът е напълно безопасен и е одобрен от Световната здравна организация. Над 95% от клиентите са доволни.",
  product:
    "Нашият иновативен крем съдържа стволови клетки от планински растения и премахва бръчките за 7 дни. Клинично доказано: 100% от тестваните жени изглеждат с 20 години по-млади. Цена само 19.99 лв.",
  news:
    "Според неназован източник, правителството планира да забрани употребата на интернет в петък. Експерти твърдят, че мярката ще засегне всички граждани и вече се подготвя законопроект.",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewCheck() {
  const nav = useNavigate();
  const [type, setType] = useState("article");
  const [mode, setMode] = useState("text"); // text | image
  const [text, setText] = useState("");
  const [image, setImage] = useState(null); // { base64, preview, name }
  const [loading, setLoading] = useState(false);
  const captureInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Моля, избери файл със снимка.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Снимката е твърде голяма (макс 8 MB).");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setImage({
        base64,
        preview: URL.createObjectURL(file),
        name: file.name || "снимка",
      });
    } catch {
      toast.error("Грешка при четене на снимката.");
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === "text") {
        if (text.trim().length < 20) {
          toast.error("Текстът трябва да е поне 20 символа.");
          setLoading(false);
          return;
        }
        res = await analyze({ text, check_type: type });
      } else {
        if (!image) {
          toast.error("Моля, добави или заснеми снимка.");
          setLoading(false);
          return;
        }
        res = await analyzeImage({ image_base64: image.base64, check_type: type });
      }
      toast.success("Анализът е готов.");
      nav(`/result/${res.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Грешка при анализа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="page-new-check">
      <div className="rc-reveal">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8b949e] mb-3">
          ▸ нова проверка
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          Какво да анализираме?
        </h1>
        <p className="text-[#8b949e]">
          Изберете тип съдържание и въведете текст или заснемете снимка.
        </p>
      </div>

      {/* Mode switcher: Text vs Image */}
      <div className="inline-flex bg-[#161b22] border border-[#30363d] rounded-lg p-1" data-testid="mode-switcher">
        {[
          { id: "text", label: "Текст", icon: Type },
          { id: "image", label: "Снимка", icon: ImageIcon },
        ].map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`mode-${m.id}`}
              onClick={() => setMode(m.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                active
                  ? "bg-[#21262d] text-white shadow-[0_0_10px_rgba(63,185,80,0.15)]"
                  : "text-[#8b949e] hover:text-[#c9d1d9]"
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`type-${t.id}`}
              onClick={() => setType(t.id)}
              className={`text-left p-4 rounded-lg border transition-all ${
                active
                  ? "bg-[#21262d] border-[#3fb950]/60 shadow-[0_0_15px_rgba(63,185,80,0.15)]"
                  : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={active ? "text-[#3fb950]" : "text-[#8b949e]"} strokeWidth={1.75} />
                <span className={`font-medium ${active ? "text-white" : "text-[#c9d1d9]"}`}>{t.label}</span>
              </div>
              <div className="text-xs text-[#8b949e] leading-relaxed">{t.desc}</div>
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "text" ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden focus-within:border-[#58a6ff] transition-colors">
            <textarea
              data-testid="input-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Въведете текст, връзка или описание за проверка…"
              rows={10}
              className="w-full bg-transparent text-[#c9d1d9] placeholder-[#484f58] p-4 outline-none font-body text-sm leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#30363d] bg-[#0d1117]">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#484f58]">
                {text.length} символа
              </div>
              <button
                type="button"
                data-testid="load-sample"
                onClick={() => setText(SAMPLES[type])}
                className="font-mono text-[10px] uppercase tracking-wider text-[#8b949e] hover:text-[#3fb950]"
              >
                зареди пример →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
            {/* Hidden inputs */}
            <input
              ref={captureInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              data-testid="input-capture"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="input-upload"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!image ? (
              <div className="p-8 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                  <ImageIcon size={22} className="text-[#8b949e]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[#c9d1d9] font-medium mb-1">Анализ от снимка</div>
                  <p className="text-xs text-[#8b949e] max-w-md">
                    Заснеми реклама, етикет или скрийншот. Gemini 3 Pro ще извлече текста и
                    твърденията, после ще ги провери в мрежата.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    data-testid="btn-capture"
                    onClick={() => captureInputRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-medium px-4 py-2 rounded-md border border-[#30363d] text-sm"
                  >
                    <Camera size={14} />
                    Заснеми
                  </button>
                  <button
                    type="button"
                    data-testid="btn-upload"
                    onClick={() => uploadInputRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-medium px-4 py-2 rounded-md border border-[#30363d] text-sm"
                  >
                    <Upload size={14} />
                    Качи от устройство
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4" data-testid="image-preview">
                <div className="relative rounded-md overflow-hidden border border-[#30363d] bg-[#0d1117]">
                  <img
                    src={image.preview}
                    alt={image.name}
                    className="w-full max-h-[420px] object-contain bg-[#0d1117]"
                  />
                  <button
                    type="button"
                    data-testid="btn-remove-image"
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#0d1117]/80 backdrop-blur border border-[#30363d] text-[#c9d1d9] hover:text-[#f85149] hover:border-[#f85149]/40 flex items-center justify-center transition-colors"
                    title="Премахни"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#484f58] truncate">
                    {image.name}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => captureInputRef.current?.click()}
                      className="font-mono text-[10px] uppercase tracking-wider text-[#8b949e] hover:text-[#3fb950]"
                    >
                      ↺ заснеми отново
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          data-testid="submit-analyze"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-md border border-white/10 transition-colors shadow-[0_0_20px_rgba(63,185,80,0.25)]"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {mode === "image"
                ? "Извличане от снимка → анализ…"
                : "Търсене (Google Search) → анализ (Gemini 3 Pro)…"}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Анализирай
            </>
          )}
        </button>
      </form>
    </div>
  );
}
