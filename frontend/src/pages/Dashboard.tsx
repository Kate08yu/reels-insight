import { useState } from "react";
import { getAccount, analyzeReel, AccountStats, ReelDetail } from "../api/client";
import ReelCard from "../components/ReelCard";
import MetricsChart from "../components/MetricsChart";
import KeywordCloud from "../components/KeywordCloud";

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
  <div style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px 20px",
    flex: 1,
    minWidth: 120,
  }}>
    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
  </div>
);

export default function Dashboard() {
  const [username, setUsername] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [reelDetail, setReelDetail] = useState<ReelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    setStats(null);
    try {
      const data = await getAccount(username.trim().replace("@", ""));
      setStats(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!reelUrl.trim()) return;
    setAnalyzeLoading(true);
    setReelDetail(null);
    try {
      const data = await analyzeReel(reelUrl.trim());
      setReelDetail(data);
    } catch {
      setReelDetail(null);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* 계정 검색 */}
      <section>
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>계정 분석</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="@인스타그램_계정명"
            style={inputStyle}
          />
          <button onClick={handleSearch} disabled={loading} style={btnStyle}>
            {loading ? "분석 중…" : "분석"}
          </button>
        </div>
        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {/* 계정 지표 */}
      {stats && (
        <>
          <section>
            <h3 style={{ marginBottom: 12, fontSize: 16, color: "var(--muted)" }}>@{stats.username} 요약</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatBox label="릴스 수" value={stats.reel_count} />
              <StatBox label="평균 조회수" value={fmt(stats.avg_views)} />
              <StatBox label="평균 좋아요" value={fmt(stats.avg_likes)} />
              <StatBox label="평균 댓글" value={fmt(stats.avg_comments)} />
              <StatBox label="참여율" value={`${stats.avg_engagement_rate}%`} />
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>조회수·좋아요·댓글 추이</h3>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
              <MetricsChart reels={stats.reels} />
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>인기 해시태그</h3>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
              <KeywordCloud hashtags={stats.top_hashtags} />
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>릴스 목록</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {stats.reels.map((r) => <ReelCard key={r.shortcode} reel={r} />)}
            </div>
          </section>
        </>
      )}

      {/* 단일 릴스 분석 */}
      <section>
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>릴스 영상 분석</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={reelUrl}
            onChange={(e) => setReelUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="https://www.instagram.com/reel/..."
            style={{ ...inputStyle, flex: 2 }}
          />
          <button onClick={handleAnalyze} disabled={analyzeLoading} style={btnStyle}>
            {analyzeLoading ? "분석 중…" : "분석"}
          </button>
        </div>

        {reelDetail?.analysis && (
          <div style={{ marginTop: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <p><span style={{ color: "var(--muted)", fontSize: 12 }}>요약</span><br /><strong>{reelDetail.analysis.summary}</strong></p>
            <p><span style={{ color: "var(--muted)", fontSize: 12 }}>분위기</span><br />{reelDetail.analysis.tone}</p>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>키워드</span>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {reelDetail.analysis.keywords.map((k) => (
                  <span key={k} style={{ background: "var(--surface2)", color: "var(--accent)", padding: "3px 10px", borderRadius: 20, fontSize: 13 }}>{k}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 14,
};
