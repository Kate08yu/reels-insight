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

        {reelDetail?.analysis && (() => {
          const a = reelDetail.analysis;
          const strengthColor = a.hook.strength === "강함" ? "#4caf50" : a.hook.strength === "약함" ? "#ff6b6b" : "var(--accent)";
          return (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 요약 */}
              <div style={cardStyle}>
                <Row label="한 줄 요약" value={<strong>{a.summary}</strong>} />
                <Row label="콘텐츠 톤" value={a.tone} />
                <div>
                  <Label>키워드</Label>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {a.keywords.map((k) => <span key={k} style={tagStyle}>{k}</span>)}
                  </div>
                </div>
              </div>

              {/* 후킹 분석 */}
              <div style={cardStyle}>
                <h4 style={sectionTitle}>🎣 후킹 분석</h4>
                <Row label="사용 기법" value={a.hook.technique} />
                <Row label="강도" value={<span style={{ color: strengthColor, fontWeight: 700 }}>{a.hook.strength}</span>} />
                <Row label="분석" value={a.hook.reason} />
              </div>

              {/* 구조 분석 */}
              <div style={cardStyle}>
                <h4 style={sectionTitle}>🏗️ 구조 분석</h4>
                <Row label="구성 패턴" value={a.structure.pattern} />
                <Row label="영상 템포" value={a.structure.pacing} />
                <Row label="루프 유도" value={a.structure.loop_potential} />
              </div>

              {/* 장면별 분석 */}
              {a.scenes?.length > 0 && (
                <div style={cardStyle}>
                  <h4 style={sectionTitle}>🎬 장면별 분석</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {a.scenes.map((s) => (
                      <div key={s.scene} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                        <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.scene}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontSize: 14 }}>{s.description}</div>
                          {s.technique && <div style={{ fontSize: 12, color: "var(--muted)" }}>기법: {s.technique}</div>}
                          {s.psychology && <div style={{ fontSize: 12, color: "var(--muted)" }}>심리 반응: {s.psychology}</div>}
                          {s.retention_score && <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>시청 유지 점수: {s.retention_score}/10</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 알고리즘 & 참여 요소 */}
              <div style={cardStyle}>
                <h4 style={sectionTitle}>📊 알고리즘 & 참여 분석</h4>
                <Row label="시청 완료율 전략" value={a.algorithm_factors.watch_time_optimization} />
                <Row label="공유 가능성" value={
                  <><span style={{ fontWeight: 700, color: a.algorithm_factors.shareability === "높음" ? "#4caf50" : a.algorithm_factors.shareability === "낮음" ? "#ff6b6b" : "var(--accent)" }}>{a.algorithm_factors.shareability}</span> — {a.algorithm_factors.shareability_reason}</>
                } />
                {a.engagement_triggers?.length > 0 && (
                  <div>
                    <Label>참여 유발 요소</Label>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                      {a.engagement_triggers.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* 약점 & 개선안 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ ...cardStyle, borderTop: "3px solid #ff6b6b" }}>
                  <h4 style={{ ...sectionTitle, color: "#ff6b6b" }}>⚠️ 약점</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                    {a.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
                <div style={{ ...cardStyle, borderTop: "3px solid #4caf50" }}>
                  <h4 style={{ ...sectionTitle, color: "#4caf50" }}>✅ 개선 제안</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                    {a.improvement.map((imp, i) => <li key={i}>{imp}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: 14,
  fontWeight: 700,
};

const tagStyle: React.CSSProperties = {
  background: "var(--surface2)",
  color: "var(--accent)",
  padding: "3px 10px",
  borderRadius: 20,
  fontSize: 13,
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: "var(--muted)", fontSize: 12 }}>{children}</span>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    <div style={{ marginTop: 4, fontSize: 14 }}>{value}</div>
  </div>
);

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
