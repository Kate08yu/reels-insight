import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Carousel from "./pages/Carousel";
import Compare from "./pages/Compare";

const navStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 16px",
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 600,
  background: active ? "var(--accent)" : "transparent",
  color: active ? "#fff" : "var(--muted)",
  border: active ? "none" : "1px solid var(--border)",
  cursor: "pointer",
  textDecoration: "none",
  transition: "all 0.15s",
});

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontWeight: 800,
            fontSize: 18,
            background: "linear-gradient(135deg,#e1306c,#833ab4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Reels Insight
          </span>
        </NavLink>

        <nav style={{ display: "flex", gap: 8 }}>
          <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>
            🎬 릴스 분석
          </NavLink>
          <NavLink to="/carousel" style={({ isActive }) => navStyle(isActive)}>
            🖼️ 캐러셀 분석
          </NavLink>
          <NavLink to="/compare" style={({ isActive }) => navStyle(isActive)}>
            📊 계정 비교
          </NavLink>
        </nav>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/carousel" element={<Carousel />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </div>
  );
}
