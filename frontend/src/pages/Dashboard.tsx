import { useState } from "react";
import { analyzeReel, ReelDetail } from "../api/client";
import AnalysisResult from "../components/AnalysisResult";

const c = {
  input: {
    flex: 1,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--text)",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,
  btn: {
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  } as React.CSSProperties,
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
  } as React.CSSProperties,
};

export default function Dashboard() {
  const [reelUrl, setReelUrl] = useState("");
  const [saveToNotion, setSaveToNotion] = useState(false);
  const [result, setResult] = useState<ReelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!reelUrl.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeReel(reelUrl.trim(), saveToNotion);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>릴스 영상 분석</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
          인스타그램 릴스 URL을 입력하면 영상을 다운로드해 프레임별로 분석합니다.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={reelUrl}
            onChange={(e) => setReelUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="https://www.instagram.com/reel/..."
            style={{ ...c.input, flex: 2 }}
          />
          <button onClick={handleAnalyze} disabled={loading} style={c.btn}>
            {loading ? "분석 중…" : "분석"}
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={saveToNotion} onChange={(e) => setSaveToNotion(e.target.checked)} />
          노션에 자동 저장
        </label>
        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {result?.notion_url && (
        <div style={{ ...c.card, borderLeft: "3px solid #4caf50", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>노션에 저장됐습니다</div>
            <a href={result.notion_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
              노션에서 보기 →
            </a>
          </div>
        </div>
      )}

      {result?.analysis && <AnalysisResult analysis={result.analysis} />}
    </div>
  );
}
