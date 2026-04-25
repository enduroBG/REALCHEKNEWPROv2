import { useEffect, useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Auto-close drawer on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-screen flex bg-[#0d1117] text-[#c9d1d9]" data-testid="app-layout">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <main className="flex-1 min-w-0 rc-grid-bg">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#161b22]/95 backdrop-blur border-b border-[#30363d]"
          data-testid="mobile-topbar"
        >
          <button
            type="button"
            data-testid="hamburger-btn"
            onClick={() => setOpen(true)}
            className="w-10 h-10 -ml-2 inline-flex items-center justify-center rounded-md text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
            aria-label="Меню"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <NavLink to="/" className="flex items-center gap-2" data-testid="mobile-logo">
            <div className="bg-white rounded px-2 py-1">
              <img src="/assets/logo.jpg" alt="RealCheck" className="h-6 w-auto block" />
            </div>
          </NavLink>
          <div className="w-10" />
        </header>

        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
