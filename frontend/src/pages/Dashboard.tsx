import { useState } from "react";
import { analyzeReel, ReelDetail } from "../api/client";

const c = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 12,
  },
  tag: {
    background: "var(--surface2)",
    color: "var(--accent)",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 13,
  },
  label: { color: "var(--muted)", fontSize: 12 } as React.CSSProperties,
  sectionTitle: { margin: "0 0 4px", fontSize: 15, fontWeight: 700 } as React.CSSProperties,
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
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <span style={c.label}>{children}</span>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.6 }}>{value}</div>
  </div>
);

const strengthColor = (s: string) =>
  s === "강함" ? "#4caf50" : s === "약함" ? "#ff6b6b" : "var(--accent)";

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

  const a = result?.analysis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 입력 */}
      <section>
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>릴스 영상 분석</h2>
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
          <input
            type="checkbox"
            checked={saveToNotion}
            onChange={(e) => setSaveToNotion(e.target.checked)}
          />
          노션에 자동 저장
        </label>
        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {/* 노션 저장 결과 */}
      {result?.notion_url && (
        <div style={{ ...c.card, borderLeft: "3px solid #4caf50", flexDirection: "row", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>노션에 저장됐습니다</div>
            <a href={result.notion_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
              노션에서 보기 →
            </a>
          </div>
        </div>
      )}

      {a && (
        <>
          {/* 요약 */}
          <div style={c.card}>
            <Row label="한 줄 요약" value={<strong>{a.summary}</strong>} />
            <Row label="콘텐츠 톤" value={a.tone} />
            <div>
              <Label>키워드</Label>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {a.keywords.map((k) => <span key={k} style={c.tag}>{k}</span>)}
              </div>
            </div>
          </div>

          {/* 후킹 분석 */}
          <div style={c.card}>
            <h4 style={c.sectionTitle}>🎣 후킹 분석</h4>
            <Row label="사용 기법" value={a.hook.technique} />
            <Row label="강도" value={
              <span style={{ color: strengthColor(a.hook.strength), fontWeight: 700 }}>{a.hook.strength}</span>
            } />
            <Row label="분석" value={a.hook.reason} />
          </div>

          {/* 구조 분석 */}
          <div style={c.card}>
            <h4 style={c.sectionTitle}>🏗️ 구조 분석</h4>
            <Row label="구성 패턴" value={a.structure.pattern} />
            <Row label="영상 템포" value={a.structure.pacing} />
            <Row label="루프 유도" value={a.structure.loop_potential} />
          </div>

          {/* 장면별 분석 */}
          {a.scenes?.length > 0 && (
            <div style={c.card}>
              <h4 style={c.sectionTitle}>🎬 장면별 분석</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {a.scenes.map((s) => (
                  <div key={s.scene} style={{ display: "flex", gap: 12, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                    <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {s.scene}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 14 }}>{s.description}</div>
                      {s.technique && <div style={{ fontSize: 12, color: "var(--muted)" }}>기법: {s.technique}</div>}
                      {s.psychology && <div style={{ fontSize: 12, color: "var(--muted)" }}>심리 반응: {s.psychology}</div>}
                      {s.retention_score && (
                        <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                          시청 유지: {s.retention_score}/10
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 알고리즘 & 참여 */}
          <div style={c.card}>
            <h4 style={c.sectionTitle}>📊 알고리즘 & 참여 분석</h4>
            <Row label="시청 완료율 전략" value={a.algorithm_factors.watch_time_optimization} />
            <Row label="공유 가능성" value={
              <><span style={{ fontWeight: 700, color: strengthColor(a.algorithm_factors.shareability) }}>{a.algorithm_factors.shareability}</span> — {a.algorithm_factors.shareability_reason}</>
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
            <div style={{ ...c.card, borderTop: "3px solid #ff6b6b" }}>
              <h4 style={{ ...c.sectionTitle, color: "#ff6b6b" }}>⚠️ 약점</h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                {a.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
            <div style={{ ...c.card, borderTop: "3px solid #4caf50" }}>
              <h4 style={{ ...c.sectionTitle, color: "#4caf50" }}>✅ 개선 제안</h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                {a.improvement.map((imp, i) => <li key={i}>{imp}</li>)}
              </ul>
            </div>
          </div>

          {/* 벤치마킹 가이드 */}
          <div style={{ ...c.card, borderTop: "3px solid var(--accent)" }}>
            <h4 style={{ ...c.sectionTitle, color: "var(--accent)" }}>🎯 벤치마킹 가이드</h4>
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 16px" }}>
              <Label>후킹 템플릿 (바로 사용 가능)</Label>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                "{a.benchmarking.hook_template}"
              </div>
            </div>
            <Row label="구조 따라하기" value={
              <div style={{ whiteSpace: "pre-line" }}>{a.benchmarking.structure_template}</div>
            } />
            <Row label="시각적 스타일" value={a.benchmarking.visual_style} />
            <Row label="오디오 전략" value={a.benchmarking.audio_strategy} />
            <Row label="캡션 전략" value={a.benchmarking.caption_strategy} />
            <div>
              <Label>제작 체크리스트</Label>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 2 }}>
                {a.benchmarking.checklist.map((item, i) => (
                  <li key={i} style={{ listStyle: "none", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>☐</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
