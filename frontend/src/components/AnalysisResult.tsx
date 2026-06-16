import { useState } from "react";
import { VideoAnalysis } from "../api/client";

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
  tag: { background: "var(--surface2)", color: "var(--accent)", padding: "3px 10px", borderRadius: 20, fontSize: 13 },
  label: { color: "var(--muted)", fontSize: 12 } as React.CSSProperties,
  sectionTitle: { margin: "0 0 4px", fontSize: 15, fontWeight: 700 } as React.CSSProperties,
  th: {
    padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "var(--muted)",
    textAlign: "left" as const, borderBottom: "2px solid var(--border)",
    background: "var(--surface2)", whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "8px 10px", fontSize: 13, lineHeight: 1.6,
    borderBottom: "1px solid var(--border)", verticalAlign: "top" as const,
  },
};

const Label = ({ children }: { children: React.ReactNode }) => <span style={c.label}>{children}</span>;

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <Label>{label}</Label>
    <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.6 }}>{value}</div>
  </div>
);

const strengthColor = (s: string) =>
  s === "강함" || s === "높음" ? "#4caf50" : s === "약함" || s === "낮음" ? "#ff6b6b" : "var(--accent)";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} style={{
      background: copied ? "#4caf50" : "var(--surface2)",
      color: copied ? "#fff" : "var(--muted)",
      border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12,
      cursor: "pointer", transition: "all 0.15s",
    }}>
      {copied ? "복사됨 ✓" : "복사"}
    </button>
  );
}

export default function AnalysisResult({ analysis: a }: { analysis: VideoAnalysis }) {
  return (
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
        {a.structure.emotion_flow && <Row label="감정 흐름" value={a.structure.emotion_flow} />}
        <Row label="템포" value={a.structure.pacing} />
        <Row label="루프 유도" value={a.structure.loop_potential} />
      </div>

      {/* 장면별 분석 — 테이블 */}
      {a.scenes?.length > 0 && (
        <div style={c.card}>
          <h4 style={c.sectionTitle}>🎬 장면별 분석</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...c.th, width: 32 }}>#</th>
                  <th style={c.th}>화면 텍스트</th>
                  <th style={c.th}>기법</th>
                  <th style={c.th}>심리 반응</th>
                  <th style={{ ...c.th, width: 70, textAlign: "center" as const }}>유지 점수</th>
                </tr>
              </thead>
              <tbody>
                {a.scenes.map((s) => (
                  <tr key={s.scene}>
                    <td style={{ ...c.td, textAlign: "center" as const }}>
                      <span style={{
                        background: "var(--accent)", color: "#fff", borderRadius: "50%",
                        width: 22, height: 22, display: "inline-flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, fontWeight: 700,
                      }}>{s.scene}</span>
                    </td>
                    <td style={c.td}>
                      {s.text ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.text}</div>
                          {s.text_kr && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{s.text_kr}</div>}
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{s.description}</span>
                      )}
                    </td>
                    <td style={{ ...c.td, color: "var(--muted)", fontSize: 12 }}>{s.technique}</td>
                    <td style={{ ...c.td, fontSize: 12 }}>{s.psychology}</td>
                    <td style={{ ...c.td, textAlign: "center" as const }}>
                      <span style={{
                        color: Number(s.retention_score) >= 8 ? "#4caf50" : Number(s.retention_score) >= 6 ? "var(--accent)" : "#ff6b6b",
                        fontWeight: 700, fontSize: 14,
                      }}>{s.retention_score}</span>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>/10</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* 전체 대사 & 한국어 해석 */}
      {a.transcript && (
        <div style={c.card}>
          <h4 style={c.sectionTitle}>📝 전체 대사 & 한국어 해석</h4>
          <div>
            <Label>원문</Label>
            <div style={{
              marginTop: 6, background: "var(--surface2)", borderRadius: 8,
              padding: "12px 14px", fontSize: 13, lineHeight: 1.8,
              borderLeft: "3px solid var(--accent)", whiteSpace: "pre-wrap",
            }}>{a.transcript}</div>
          </div>
          {a.transcript_kr && (
            <div>
              <Label>한국어 해석</Label>
              <div style={{
                marginTop: 6, background: "var(--surface2)", borderRadius: 8,
                padding: "12px 14px", fontSize: 13, lineHeight: 1.8,
                borderLeft: "3px solid #4caf50", whiteSpace: "pre-wrap",
              }}>{a.transcript_kr}</div>
            </div>
          )}
        </div>
      )}

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
        <Row label="구조 따라하기" value={<div style={{ whiteSpace: "pre-line" }}>{a.benchmarking.structure_template}</div>} />
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

      {/* 캡션 제안 */}
      {a.caption_suggestions && a.caption_suggestions.length > 0 && (
        <div style={c.card}>
          <h4 style={c.sectionTitle}>✍️ 내 계정용 캡션 제안</h4>
          {a.caption_suggestions.map((cap, i) => {
            const labels = ["버전 1 — 공감형", "버전 2 — 질문형", "버전 3 — 임팩트형"];
            return (
              <div key={i} style={{ background: "var(--surface2)", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                    {labels[i] ?? `버전 ${i + 1}`}
                  </span>
                  <CopyButton text={cap} />
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{cap}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
