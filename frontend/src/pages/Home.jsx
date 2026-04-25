import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, AlertTriangle, HelpCircle, BarChart3, Sparkles } from "lucide-react";
import { getStats, listChecks } from "@/lib/api";
import VerdictTag from "@/components/VerdictTag";

function StatBox({ label, value, accent, icon: Icon, testid }) {
  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 hover:border-[#8b949e]/40 transition-colors rc-reveal"
      data-testid={testid}
    >
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b949e]">{label}</div>
        {Icon && <Icon size={16} className="text-[#484f58]" strokeWidth={1.5} />}
      </div>
      <div className="mt-3 font-mono text-3xl font-bold" style={{ color: accent || "#c9d1d9" }}>
        {value}
      </div>
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), listChecks()])
      .then(([s, c]) => {
        setStats(s);
        setRecent(c.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8" data-testid="page-home">
      {/* Hero */}
      <section className="rc-reveal">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8b949e] mb-3">
          ▸ контролно табло
        </div>
        <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
          Анализирай. Провери. <span className="text-[#3fb950]">Доверявай се.</span>
        </h1>
        <p className="text-[#8b949e] max-w-2xl text-base leading-relaxed">
          RealCheck открива подвеждащи, преувеличени и непотвърдени твърдения в статии,
          реклами и новини с помощта на Gemini 3 Pro.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/new"
            data-testid="cta-new-check"
            className="inline-flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white font-medium px-5 py-2.5 rounded-md border border-white/10 transition-colors shadow-[0_0_20px_rgba(63,185,80,0.2)]"
          >
            <Sparkles size={16} />
            Нова проверка
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-medium px-5 py-2.5 rounded-md border border-[#30363d] transition-colors"
          >
            Виж история
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox testid="stat-total" label="Общо проверки" value={loading ? "—" : stats?.total_checks ?? 0} icon={BarChart3} />
        <StatBox testid="stat-avg" label="Среден рейтинг" value={loading ? "—" : stats?.avg_score ?? 0} accent="#3fb950" icon={ShieldCheck} />
        <StatBox testid="stat-suspicious" label="Съмнителни" value={loading ? "—" : stats?.total_suspicious ?? 0} accent="#d29922" icon={AlertTriangle} />
        <StatBox testid="stat-unconfirmed" label="Непотвърдени" value={loading ? "—" : stats?.total_unconfirmed ?? 0} accent="#f85149" icon={HelpCircle} />
      </section>

      {/* Recent checks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold text-white">Последни проверки</h2>
          <Link to="/history" className="font-mono text-xs uppercase tracking-wider text-[#8b949e] hover:text-[#c9d1d9]">
            всички →
          </Link>
        </div>
        {loading ? (
          <div className="text-[#8b949e] text-sm">Зареждане…</div>
        ) : recent.length === 0 ? (
          <div className="bg-[#161b22] border border-dashed border-[#30363d] rounded-lg p-10 text-center">
            <div className="font-mono text-xs uppercase tracking-wider text-[#484f58] mb-2">няма данни</div>
            <p className="text-[#8b949e] mb-4">Все още нямаш проверки. Започни сега.</p>
            <Link
              to="/new"
              data-testid="empty-cta-new"
              className="inline-flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white font-medium px-4 py-2 rounded-md text-sm"
            >
              <Sparkles size={14} /> Стартирай първа проверка
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((c) => (
              <Link
                key={c.id}
                to={`/result/${c.id}`}
                data-testid={`recent-${c.id}`}
                className="block bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]/50 rounded-lg p-4 transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#484f58]">
                        {c.check_type}
                      </span>
                      <span className="text-[#484f58]">•</span>
                      <span className="font-mono text-[10px] text-[#8b949e]">
                        {new Date(c.created_at).toLocaleDateString("bg-BG")}
                      </span>
                    </div>
                    <div className="font-medium text-[#c9d1d9] truncate group-hover:text-white">{c.title}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RiskBadge level={c.risk_level} />
                    <div
                      className="font-mono text-2xl font-bold"
                      style={{
                        color:
                          c.reality_score >= 75
                            ? "#3fb950"
                            : c.reality_score >= 50
                            ? "#d29922"
                            : "#f85149",
                      }}
                    >
                      {c.reality_score}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function RiskBadge({ level }) {
  const map = {
    low: { label: "Нисък риск", color: "#3fb950", bg: "rgba(63,185,80,0.1)" },
    medium: { label: "Среден риск", color: "#d29922", bg: "rgba(210,153,34,0.1)" },
    high: { label: "Висок риск", color: "#f85149", bg: "rgba(248,81,73,0.1)" },
  };
  const m = map[level] || map.medium;
  return (
    <span
      data-testid={`risk-${level}`}
      className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border"
      style={{ color: m.color, background: m.bg, borderColor: `${m.color}33` }}
    >
      {m.label}
    </span>
  );
}
