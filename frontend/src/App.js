import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import NewCheck from "@/pages/NewCheck";
import Result from "@/pages/Result";
import History from "@/pages/History";
import Favorites from "@/pages/Favorites";
import Settings from "@/pages/Settings";

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewCheck />} />
            <Route path="/result/:id" element={<Result />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#161b22",
            border: "1px solid #30363d",
            color: "#c9d1d9",
            fontFamily: "IBM Plex Sans",
          },
        }}
      />
    </div>
  );
}

export default App;
