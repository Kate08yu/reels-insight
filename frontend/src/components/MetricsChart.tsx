import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { ReelMetrics } from "../api/client";

interface Props {
  reels: ReelMetrics[];
}

export default function MetricsChart({ reels }: Props) {
  const data = [...reels]
    .sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
    .map((r, i) => ({
      name: r.timestamp ? r.timestamp.slice(0, 10) : `#${i + 1}`,
      조회수: r.views,
      좋아요: r.likes,
      댓글: r.comments,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
        <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} />
        <YAxis tick={{ fill: "#888", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="조회수" stroke="#e1306c" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="좋아요" stroke="#833ab4" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="댓글" stroke="#fcaf45" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
