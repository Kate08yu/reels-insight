import { useRef, useState } from "react";
import { analyzeCarousel, ReelDetail } from "../api/client";
import AnalysisResult from "../components/AnalysisResult";

export default function Carousel() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saveToNotion, setSaveToNotion] = useState(false);
  const [result, setResult] = useState<ReelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).slice(0, 15);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setResult(null);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeCarousel(files, saveToNotion);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const c = {
    card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 } as React.CSSProperties,
    btn: { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" } as React.CSSProperties,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>캐러셀 이미지 분석</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
          인스타그램 캐러셀 슬라이드를 순서대로 업로드하세요. 최대 15장
        </p>

        {/* 드롭존 */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{
            ...c.card,
            border: "2px dashed var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 120,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
        >
          <span style={{ fontSize: 32 }}>🖼️</span>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            클릭하거나 이미지를 드래그해서 업로드 ({files.length}/15)
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* 미리보기 */}
        {previews.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={src}
                  alt={`slide-${i + 1}`}
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <span style={{
                  position: "absolute", top: 2, left: 4,
                  background: "rgba(0,0,0,0.6)", color: "#fff",
                  fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 4px",
                }}>
                  {i + 1}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    background: "#ff6b6b", color: "#fff", border: "none",
                    borderRadius: "50%", width: 18, height: 18,
                    fontSize: 10, cursor: "pointer", lineHeight: "18px", padding: 0,
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
          <button
            onClick={handleAnalyze}
            disabled={loading || files.length === 0}
            style={{ ...c.btn, opacity: files.length === 0 ? 0.5 : 1 }}
          >
            {loading ? `분석 중… (${files.length}장)` : `분석하기 (${files.length}장)`}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={saveToNotion} onChange={(e) => setSaveToNotion(e.target.checked)} />
            노션에 자동 저장
          </label>
        </div>
        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {result?.notion_url && (
        <div style={{ ...c.card, borderLeft: "3px solid #4caf50", flexDirection: "row", alignItems: "center", gap: 12, display: "flex" }}>
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
