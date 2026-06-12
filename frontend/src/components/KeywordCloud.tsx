interface Props {
  hashtags: [string, number][];
}

export default function KeywordCloud({ hashtags }: Props) {
  if (!hashtags.length) return <p style={{ color: "var(--muted)", fontSize: 13 }}>해시태그 없음</p>;

  const max = hashtags[0][1] || 1;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {hashtags.map(([tag, count]) => {
        const ratio = count / max;
        const size = 12 + ratio * 14;
        const opacity = 0.5 + ratio * 0.5;
        return (
          <span
            key={tag}
            title={`${count}회`}
            style={{
              fontSize: size,
              color: `rgba(225,48,108,${opacity})`,
              background: "var(--surface2)",
              padding: "4px 10px",
              borderRadius: 20,
              fontWeight: ratio > 0.6 ? 700 : 400,
              transition: "all .2s",
            }}
          >
            #{tag}
            <sup style={{ fontSize: 10, marginLeft: 2, color: "var(--muted)" }}>{count}</sup>
          </span>
        );
      })}
    </div>
  );
}
