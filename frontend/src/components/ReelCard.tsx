import { ReelMetrics } from "../api/client";

interface Props {
  reel: ReelMetrics;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

export default function ReelCard({ reel }: Props) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {reel.thumbnail ? (
        <div style={{ position: "relative", paddingTop: "133%", background: "var(--surface2)" }}>
          <img
            src={reel.thumbnail}
            alt="thumbnail"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : (
        <div style={{ height: 180, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 32 }}>
          🎬
        </div>
      )}

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {reel.caption && (
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {reel.caption}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, fontSize: 13, fontWeight: 600 }}>
          <span title="조회수">▶ {fmt(reel.views)}</span>
          <span title="좋아요">♥ {fmt(reel.likes)}</span>
          <span title="댓글">💬 {fmt(reel.comments)}</span>
        </div>
        {reel.hashtags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {reel.hashtags.slice(0, 4).map((tag) => (
              <span key={tag} style={{ fontSize: 11, background: "var(--surface2)", color: "var(--accent)", padding: "2px 7px", borderRadius: 20 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
