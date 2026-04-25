import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Trash2, FileText, ShoppingBag, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { getCheck, toggleFavorite, deleteCheck } from "@/lib/api";
import ScoreCircle from "@/components/ScoreCircle";
import VerdictTag from "@/components/VerdictTag";
import { RiskBadge } from "@/pages/Home";

const CAT_LABELS = {
  effectiveness: "Ефективност",
  safety: "Безопасност",
  price: "Цена",
  evidence: "Доказателства",
};

const TYPE_META = {
  article: { label: "Статия", icon: FileText },
  product: { label: "Продукт / Реклама", icon: ShoppingBag },
  news: { label: "Новина", icon: Newspaper },
};

export default function Result() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCheck(id)
      .then(setData)
      .catch(() => toast.error("Проверката не е намерена."))
      .finally(() => setLoading(false));
  }, [id]);

  const onFav = async () => {
    try {
      const r = await toggleFavorite(id, !data.is_favorite);
      setData(r);
      toast.success(r.is_favorite ? "Добавено в любими." : "Премахнато от любими.");
    } catch {
      toast.error("Грешка.");
    }
  };

  const onDelete = async () => {
    if (!confirm("Да изтрия ли тази проверка?")) return;
    await deleteCheck(id);
    toast.success("Изтрито.");
    nav("/history");
  };

  if (loading) return <div className="text-[#8b949e]" data-testid="result-loading">Зареждане…</div>;
  if (!data) return <div className="text-[#f85149]" data-testid="result-not-found">Проверката не е намерена.</div>;

  const TypeIcon = TYPE_META[data.check_type]?.icon || FileText;

  return (
    <div className="space-y-6" data-testid="page-result">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 rc-reveal">
        <div className="min-w-0">
          <Link to="/history" data-testid="back-link" className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-[#8b949e] hover:text-[#c9d1d9] mb-3">
            <ArrowLeft size={12} /> назад
          </Link>
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#484f58]">
            <TypeIcon size={12} />
            <span>{TYPE_META[data.check_type]?.label}</span>
            <span>•</span>
            <span>{new Date(data.created_at).toLocaleString("bg-BG")}</span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white tracking-tight">
            {data.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onFav}
            data-testid="btn-favorite"
            className={`p-2.5 rounded-md border transition-colors ${
              data.is_favorite
                ? "bg-[#d29922]/10 border-[#d29922]/40 text-[#d29922]"
                : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-[#d29922] hover:border-[#d29922]/40"
            }`}
            title="Любими"
          >
            <Star size={16} fill={data.is_favorite ? "#d29922" : "transparent"} />
          </button>
          <button
            onClick={onDelete}
            data-testid="btn-delete"
            className="p-2.5 rounded-md border bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-[#f85149] hover:border-[#f85149]/40 transition-colors"
            title="Изтрий"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Hero: score + risk + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 bg-[#161b22] border border-[#30363d] rounded-lg p-6 flex items-center gap-6 rc-reveal">
          <ScoreCircle score={data.reality_score} size={170} stroke={10} />
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b949e] mb-2">
              Рейтинг на достоверност
            </div>
            <RiskBadge level={data.risk_level} />
            <p className="text-[#c9d1d9] mt-3 leading-relaxed text-sm">{data.risk_summary}</p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 bg-[#161b22] border border-[#30363d] rounded-lg p-6 rc-reveal" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Категории</h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#484f58]">оценка / 100</span>
          </div>
          <div className="space-y-4">
            {Object.entries(data.categories).map(([k, v]) => (
              <div key={k} data-testid={`cat-${k}`}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="text-[#c9d1d9]">{CAT_LABELS[k]}</span>
                  <span className="font-mono font-medium text-[#c9d1d9]">{v}%</span>
                </div>
                <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${v}%`,
                      background: v >= 75 ? "#3fb950" : v >= 50 ? "#d29922" : "#f85149",
                      boxShadow: `0 0 8px ${v >= 75 ? "#3fb950" : v >= 50 ? "#d29922" : "#f85149"}55`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Claim stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ClaimStat label="Потвърдени" count={data.claims_verified} color="#3fb950" testid="stat-verified" />
        <ClaimStat label="Съмнителни" count={data.claims_suspicious} color="#d29922" testid="stat-suspicious" />
        <ClaimStat label="Непотвърдени" count={data.claims_unconfirmed} color="#f85149" testid="stat-unconfirmed" />
      </div>

      {/* Claims list */}
      <section className="rc-reveal" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-white">Открити твърдения</h2>
          <span className="font-mono text-xs text-[#8b949e]">{data.claims_total} общо</span>
        </div>
        <div className="space-y-3">
          {data.claims.map((c, i) => (
            <div
              key={i}
              data-testid={`claim-${i}`}
              className="bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]/40 rounded-lg p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#484f58]">
                  Твърдение #{String(i + 1).padStart(2, "0")}
                </span>
                <VerdictTag verdict={c.verdict} />
              </div>
              <p className="text-[#c9d1d9] font-medium mb-2 leading-relaxed">{c.text}</p>
              <p className="text-[#8b949e] text-sm leading-relaxed border-l-2 border-[#30363d] pl-3">
                {c.explanation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Source text */}
      <details className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden" data-testid="source-toggle">
        <summary className="cursor-pointer p-4 font-mono text-xs uppercase tracking-wider text-[#8b949e] hover:text-[#c9d1d9]">
          ▸ Виж оригиналния текст
        </summary>
        <div className="p-4 border-t border-[#30363d] text-sm text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">
          {data.source_text}
        </div>
      </details>

      {/* Web grounding sources */}
      {(data.web_sources?.length > 0 || data.web_context) && (
        <section className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden" data-testid="web-sources-section">
          <div className="px-5 py-3 border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#58a6ff]">
                ▸ Източници от мрежата
              </span>
              <span className="font-mono text-[10px] text-[#484f58]">gemini 3 pro · google_search</span>
            </div>
            <span className="font-mono text-[10px] text-[#8b949e]">
              {data.web_sources?.length || 0} източника
            </span>
          </div>
          {data.web_context && (
            <div className="p-4 text-sm text-[#c9d1d9] leading-relaxed border-b border-[#30363d] whitespace-pre-wrap">
              {data.web_context}
            </div>
          )}
          {data.web_sources?.length > 0 && (
            <ul className="divide-y divide-[#30363d]">
              {data.web_sources.map((s, i) => (
                <li key={i} data-testid={`web-source-${i}`} className="px-4 py-2.5 hover:bg-[#21262d] transition-colors">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm group"
                  >
                    <span className="font-mono text-[10px] text-[#484f58] w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[#58a6ff] group-hover:underline truncate flex-1">
                      {s.title || s.url}
                    </span>
                    <span className="font-mono text-[10px] text-[#484f58] hidden md:inline truncate max-w-[300px]">
                      {(() => {
                        try {
                          return new URL(s.url).hostname;
                        } catch {
                          return s.url;
                        }
                      })()}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function ClaimStat({ label, count, color, testid }) {
  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-5"
      style={{ borderColor: count > 0 ? `${color}40` : undefined }}
      data-testid={testid}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b949e] mb-2">{label}</div>
      <div className="font-mono text-4xl font-bold" style={{ color }}>
        {count}
      </div>
    </div>
  );
}
