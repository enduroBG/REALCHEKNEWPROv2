import { NavLink } from "react-router-dom";
import { Home, Search, History, Star, Settings, Shield } from "lucide-react";

const items = [
  { to: "/", label: "Начало", icon: Home, testid: "nav-home" },
  { to: "/new", label: "Нова проверка", icon: Search, testid: "nav-new" },
  { to: "/history", label: "История", icon: History, testid: "nav-history" },
  { to: "/favorites", label: "Любими", icon: Star, testid: "nav-favorites" },
];

const bottomItems = [
  { to: "/settings", label: "Настройки", icon: Settings, testid: "nav-settings" },
];

function Item({ to, label, icon: Icon, testid }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      data-testid={testid}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors border-l-2 ${
          isActive
            ? "bg-[#21262d] text-white border-[#3fb950]"
            : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9] border-transparent"
        }`
      }
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside
      className="w-[260px] shrink-0 bg-[#161b22] border-r border-[#30363d] flex flex-col sticky top-0 h-screen"
      data-testid="sidebar"
    >
      <div className="px-6 py-6 border-b border-[#30363d]">
        <div className="flex items-center gap-2.5" data-testid="logo">
          <div className="w-8 h-8 rounded-md bg-[#238636]/15 border border-[#3fb950]/30 flex items-center justify-center shadow-[0_0_15px_rgba(63,185,80,0.15)]">
            <Shield size={18} className="text-[#3fb950]" strokeWidth={2} />
          </div>
          <div className="font-heading font-black text-xl tracking-tight">
            <span className="text-[#3fb950]">Real</span>
            <span className="text-white">Check</span>
          </div>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#484f58]">
          v1.0 · анализатор
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        <div className="px-4 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#484f58]">
          Основни
        </div>
        {items.map((item) => (
          <Item key={item.to} {...item} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#30363d] space-y-1">
        {bottomItems.map((item) => (
          <Item key={item.to} {...item} />
        ))}
        <div className="px-4 pt-3 font-mono text-[10px] text-[#484f58]">
          powered by gemini 3 pro
        </div>
      </div>
    </aside>
  );
}
