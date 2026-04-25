import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, ShoppingBag, Newspaper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { analyze } from "@/lib/api";

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

export default function NewCheck() {
  const nav = useNavigate();
  const [type, setType] = useState("article");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (text.trim().length < 20) {
      toast.error("Текстът трябва да е поне 20 символа.");
      return;
    }
    setLoading(true);
    try {
      const res = await analyze({ text, check_type: type });
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
          Изберете тип съдържание, поставете текст и натиснете „Анализирай".
        </p>
      </div>

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

        <button
          type="submit"
          disabled={loading}
          data-testid="submit-analyze"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-md border border-white/10 transition-colors shadow-[0_0_20px_rgba(63,185,80,0.25)]"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Gemini 3 Pro анализира…
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
