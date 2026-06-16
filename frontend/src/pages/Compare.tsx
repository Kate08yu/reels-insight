import { useState } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import { fetchAccountStats, AccountStats } from "../api/client";

const c = {
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 } as React.CSSProperties,
  input: {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", width: "100%",
  } as React.CSSProperties,
  btn: { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  label: { color: "var(--muted)", fontSize: 12 } as React.CSSProperties,
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(Math.round(n));

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function AccountCard({ stats, color }: { stats: AccountStats; color: string }) {
  return (
    <div style={{ ...c.card, borderTop: `3px solid ${color}`, flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color }}>@{stats.username}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <StatBox label="릴스 수" value={String(stats.reel_count)} />
        <StatBox label="평균 조회수" value={fmt(stats.avg_views)} color={color} />
        <StatBox label="평균 좋아요" value={fmt(stats.avg_likes)} />
        <StatBox label="참여율" value={`${stats.avg_engagement_rate.toFixed(2)}%`} color={color} />
      </div>
      {stats.top_hashtags.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={c.label}>인기 해시태그</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {stats.top_hashtags.slice(0, 6).map(([tag, cnt]) => (
              <span key={tag} style={{ background: "var(--surface2)", color, padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
                #{tag} <span style={{ color: "var(--muted)" }}>{cnt}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildRadar(a: AccountStats, b: AccountStats) {
  const metrics: [string, number, number][] = [
    ["평균 조회수", a.avg_views, b.avg_views],
    ["평균 좋아요", a.avg_likes, b.avg_likes],
    ["평균 댓글", a.avg_comments, b.avg_comments],
    ["참여율(%)", a.avg_engagement_rate, b.avg_engagement_rate],
    ["릴스 수", a.reel_count, b.reel_count],
  ];
  return metrics.map(([label, va, vb]) => {
    const max = Math.max(va, vb, 1);
    return { metric: label, [a.username]: +(va / max * 100).toFixed(1), [b.username]: +(vb / max * 100).toFixed(1) };
  });
}

const COLOR_A = "#e1306c";
const COLOR_B = "#4fc3f7";

export default function Compare() {
  const [usernameA, setUsernameA] = useState("");
  const [usernameB, setUsernameB] = useState("");
  const [statsA, setStatsA] = useState<AccountStats | null>(null);
  const [statsB, setStatsB] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCompare = async () => {
    if (!usernameA.trim() || !usernameB.trim()) return;
    setLoading(true);
    setError("");
    setStatsA(null);
    setStatsB(null);
    try {
      const [a, b] = await Promise.all([
        fetchAccountStats(usernameA.trim().replace("@", "")),
        fetchAccountStats(usernameB.trim().replace("@", "")),
      ]);
      setStatsA(a);
      setStatsB(b);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const radar = statsA && statsB ? buildRadar(statsA, statsB) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>계정 비교</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
          두 인스타그램 계정의 릴스 성과 지표를 비교합니다.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <div style={{ ...c.label, marginBottom: 6 }}>계정 A</div>
            <input
              value={usernameA}
              onChange={(e) => setUsernameA(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              placeholder="@username"
              style={{ ...c.input, borderColor: COLOR_A }}
            />
          </div>
          <div>
            <div style={{ ...c.label, marginBottom: 6 }}>계정 B</div>
            <input
              value={usernameB}
              onChange={(e) => setUsernameB(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              placeholder="@username"
              style={{ ...c.input, borderColor: COLOR_B }}
            />
          </div>
          <button onClick={handleCompare} disabled={loading} style={c.btn}>
            {loading ? "분석 중…" : "비교하기"}
          </button>
        </div>
        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {statsA && statsB && (
        <>
          {/* 계정 카드 */}
          <div style={{ display: "flex", gap: 16 }}>
            <AccountCard stats={statsA} color={COLOR_A} />
            <AccountCard stats={statsB} color={COLOR_B} />
          </div>

          {/* 레이더 차트 */}
          <div style={c.card}>
            <h4 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>📡 성과 레이더 차트</h4>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radar}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <Radar name={statsA.username} dataKey={statsA.username} stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.25} />
                <Radar name={statsB.username} dataKey={statsB.username} stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.25} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Tooltip formatter={(v) => `${v}`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 비교 표 */}
          <div style={c.card}>
            <h4 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>📋 지표 비교</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "8px 0", textAlign: "left", color: "var(--muted)", fontWeight: 500 }}>지표</th>
                  <th style={{ padding: "8px 0", textAlign: "right", color: COLOR_A }}>@{statsA.username}</th>
                  <th style={{ padding: "8px 0", textAlign: "right", color: COLOR_B }}>@{statsB.username}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["릴스 수", statsA.reel_count, statsB.reel_count, (v: number) => String(v)],
                  ["평균 조회수", statsA.avg_views, statsB.avg_views, fmt],
                  ["평균 좋아요", statsA.avg_likes, statsB.avg_likes, fmt],
                  ["평균 댓글", statsA.avg_comments, statsB.avg_comments, fmt],
                  ["참여율", statsA.avg_engagement_rate, statsB.avg_engagement_rate, (v: number) => `${v.toFixed(2)}%`],
                ].map(([label, va, vb, fmtFn]) => {
                  const aWins = (va as number) > (vb as number);
                  const f = fmtFn as (v: number) => string;
                  return (
                    <tr key={label as string} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 0", color: "var(--muted)" }}>{label as string}</td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontWeight: aWins ? 700 : 400, color: aWins ? COLOR_A : "var(--text)" }}>
                        {f(va as number)}
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontWeight: !aWins ? 700 : 400, color: !aWins ? COLOR_B : "var(--text)" }}>
                        {f(vb as number)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
