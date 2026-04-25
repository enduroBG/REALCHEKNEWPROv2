import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-[#0d1117] text-[#c9d1d9]" data-testid="app-layout">
      <Sidebar />
      <main className="flex-1 min-w-0 rc-grid-bg">
        <div className="max-w-[1400px] mx-auto p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
