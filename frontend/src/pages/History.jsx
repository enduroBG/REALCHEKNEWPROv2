import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { listChecks, deleteCheck, toggleFavorite } from "@/lib/api";
import { RiskBadge } from "@/pages/Home";

export default function History({ favoritesOnly = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = () => {
    setLoading(true);
    listChecks(favoritesOnly)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, [favoritesOnly]);

  const onDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Да изтрия ли тази проверка?")) return;
    await deleteCheck(id);
    toast.success("Изтрито.");
    load();
  };

  const onFav = async (id, current, e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite(id, !current);
    load();
  };

  const filtered = items.filter((i) => i.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6" data-testid={favoritesOnly ? "page-favorites" : "page-history"}>
      <div className="rc-reveal">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8b949e] mb-3">
          {favoritesOnly ? "▸ любими" : "▸ архив"}
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          {favoritesOnly ? "Любими проверки" : "История на проверките"}
        </h1>
        <p className="text-[#8b949e]">{filtered.length} резултата</p>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
        <input
          data-testid="filter-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Търси по заглавие…"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-9 pr-4 py-2 text-sm text-[#c9d1d9] placeholder-[#484f58] outline-none focus:border-[#58a6ff]"
        />
      </div>

      {loading ? (
        <div className="text-[#8b949e]">Зареждане…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#161b22] border border-dashed border-[#30363d] rounded-lg p-10 text-center">
          <div className="font-mono text-xs uppercase tracking-wider text-[#484f58] mb-2">празно</div>
          <p className="text-[#8b949e] mb-4">
            {favoritesOnly ? "Все още нямаш запазени проверки." : "Няма направени проверки."}
          </p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white font-medium px-4 py-2 rounded-md text-sm"
          >
            Започни проверка
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/result/${c.id}`}
              data-testid={`history-item-${c.id}`}
              className="block bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]/50 rounded-lg p-4 transition-colors group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 font-mono text-[10px] uppercase tracking-wider text-[#484f58]">
                    <span>{c.check_type}</span>
                    <span>•</span>
                    <span>{new Date(c.created_at).toLocaleString("bg-BG")}</span>
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
                  <button
                    onClick={(e) => onFav(c.id, c.is_favorite, e)}
                    data-testid={`fav-${c.id}`}
                    className={`p-2 rounded-md border transition-colors ${
                      c.is_favorite
                        ? "bg-[#d29922]/10 border-[#d29922]/40 text-[#d29922]"
                        : "bg-transparent border-[#30363d] text-[#8b949e] hover:text-[#d29922]"
                    }`}
                  >
                    <Star size={14} fill={c.is_favorite ? "#d29922" : "transparent"} />
                  </button>
                  <button
                    onClick={(e) => onDelete(c.id, e)}
                    data-testid={`del-${c.id}`}
                    className="p-2 rounded-md border bg-transparent border-[#30363d] text-[#8b949e] hover:text-[#f85149] hover:border-[#f85149]/40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
