import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

const navStyle = (active: boolean): React.CSSProperties => ({
  padding: "8px 20px",
  borderRadius: 8,
  background: active ? "var(--accent)" : "transparent",
  color: active ? "#fff" : "var(--muted)",
  fontWeight: 600,
  fontSize: 14,
  transition: "all .2s",
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
        gap: 32,
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, background: "linear-gradient(135deg,#e1306c,#833ab4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Reels Insight
        </span>
        <nav style={{ display: "flex", gap: 8 }}>
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
