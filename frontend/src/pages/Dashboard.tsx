import { useRef, useState } from "react";
import { analyzeReel, ReelDetail } from "../api/client";
import AnalysisResult from "../components/AnalysisResult";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";

const c = {
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
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
  } as React.CSSProperties,
};

export default function Dashboard() {
  const [tab, setTab] = useState<"url" | "file">("url");
  const [reelUrl, setReelUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const saveToNotion = true;
  const [result, setResult] = useState<ReelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      if (tab === "url") {
        if (!reelUrl.trim()) return;
        const data = await analyzeReel(reelUrl.trim(), saveToNotion, caption);
        setResult(data);
      } else {
        if (!file) return;
        const form = new FormData();
        form.append("file", file);
        form.append("save_to_notion", "true");
        form.append("caption", caption);
        const res = await axios.post<ReelDetail>(`${BASE}/api/reels/analyze-upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setResult(res.data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#fff" : "var(--muted)",
    transition: "all 0.15s",
  });

  const canSubmit = tab === "url" ? !!reelUrl.trim() : !!file;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>릴스 영상 분석</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
          인스타그램 릴스를 URL 입력 또는 영상 파일 업로드로 분석합니다.
        </p>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button style={tabStyle(tab === "url")} onClick={() => { setTab("url"); setError(""); }}>
            🔗 URL 입력
          </button>
          <button style={tabStyle(tab === "file")} onClick={() => { setTab("file"); setError(""); }}>
            📁 파일 업로드
          </button>
        </div>

        {/* URL 입력 */}
        {tab === "url" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                value={reelUrl}
                onChange={(e) => setReelUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://www.instagram.com/reel/..."
                style={{ ...c.input, flex: 2 }}
              />
              <button onClick={handleAnalyze} disabled={loading || !canSubmit} style={c.btn}>
                {loading ? "분석 중…" : "분석"}
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="인스타그램 캡션을 여기에 붙여넣기 하세요 (선택사항) — 캡션을 함께 분석해 더 정확한 결과를 제공합니다"
              rows={3}
              style={{
                ...c.input,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </div>
        )}

        {/* 파일 업로드 */}
        {tab === "file" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0] ?? null); }}
              onDragOver={(e) => e.preventDefault()}
              style={{
                ...c.card,
                border: "2px dashed var(--border)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 100,
                cursor: "pointer",
              }}
            >
              {file ? (
                <>
                  <span style={{ fontSize: 28 }}>🎬</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 28 }}>📁</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    클릭하거나 영상을 드래그해서 업로드 (mp4, mov 등)
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>최대 200MB</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
            {preview && (
              <video
                src={preview}
                controls
                style={{ width: "100%", maxHeight: 200, borderRadius: 8, background: "#000" }}
              />
            )}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="인스타그램 캡션을 여기에 붙여넣기 하세요 (선택사항) — 캡션을 함께 분석해 더 정확한 결과를 제공합니다"
              rows={3}
              style={{
                ...c.input,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={handleAnalyze}
                disabled={loading || !canSubmit}
                style={{ ...c.btn, opacity: !canSubmit ? 0.5 : 1 }}
              >
                {loading ? "분석 중… (시간이 걸릴 수 있어요)" : "분석하기"}
              </button>
              {file && (
                <button
                  onClick={() => { setFile(null); setPreview(""); }}
                  style={{ ...c.btn, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        )}

        {error && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </section>

      {result?.notion_url && (
        result.notion_url.startsWith("http") ? (
          <div style={{ ...c.card, borderLeft: "3px solid #4caf50", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>노션에 저장됐습니다</div>
              <a href={result.notion_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
                노션에서 보기 →
              </a>
            </div>
          </div>
        ) : (
          <div style={{ ...c.card, borderLeft: "3px solid #ff6b6b", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ff6b6b" }}>노션 저장 실패</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{result.notion_url}</div>
            </div>
          </div>
        )
      )}

      {result?.analysis && <AnalysisResult analysis={result.analysis} />}
    </div>
  );
}
