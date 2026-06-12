import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip,
} from "recharts";
import { compareAccounts, CompareResult, AccountStats } from "../api/client";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

const COLORS = ["#e1306c", "#833ab4"];

function AccountSummary({ stats, color }: { stats: AccountStats; color: string }) {
  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${color}55`,
      borderRadius: "var(--radius)", padding: 20, flex: 1,
    }}>
      <h3 style={{ color, marginBottom: 12 }}>@{stats.username}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {[
            ["릴스 수", stats.reel_count],
            ["평균 조회수", fmt(stats.avg_views)],
            ["평균 좋아요", fmt(stats.avg_likes)],
            ["평균 댓글", fmt(stats.avg_comments)],
            ["참여율", `${stats.avg_engagement_rate}%`],
          ].map(([label, val]) => (
            <tr key={String(label)} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "7px 0", color: "var(--muted)" }}>{label}</td>
              <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 600 }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Compare() {
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCompare = async () => {
    if (!userA.trim() || !userB.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await compareAccounts(
        userA.trim().replace("@", ""),
        userB.trim().replace("@", ""),
      );
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section>
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>경쟁 계정 비교</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={userA}
            onChange={(e) => setUserA(e.target.value)}
            placeholder="@계정A"
            style={inputStyle}
          />
          <input
            value={userB}
            onChange={(e) => setUserB(e.target.value)}
            placeholder="@계정B"
            style={inputStyle}
          />
          <button onClick={handleCompare} disabled={loading} style={btnStyle}>
            {loading ? "비교 중…" : "비교"}
          </button>
        </div>
        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {result && (
        <>
          {/* 레이더 차트 */}
          <section>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>지표 레이더</h3>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={result.radar}>
                  <PolarGrid stroke="#2e2e2e" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#555", fontSize: 10 }} />
                  <Radar name={result.account_a.username} dataKey={result.account_a.username} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.25} />
                  <Radar name={result.account_b.username} dataKey={result.account_b.username} stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.25} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 계정별 요약 */}
          <section>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>계정별 요약</h3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <AccountSummary stats={result.account_a} color={COLORS[0]} />
              <AccountSummary stats={result.account_b} color={COLORS[1]} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
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
