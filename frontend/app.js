const { useState } = React;

function normalizeResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [payload.results, payload.data, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        // JSON değilse diğer adaylara geç
      }
    }
  }

  return [];
}

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [progressLogs, setProgressLogs] = useState([]);

  const appendProgress = (message) => {
    setProgressLogs((prev) => [...prev, message]);
  };

  const handleAnalyze = async () => {
    if (!videoUrl) return;
    setLoading(true);
    setAnalysisData([]);
    setErrorMessage("");
    setProgressLogs(["⏳ İşlem başlatıldı..."]);

    let hasResult = false;

    const processEventChunk = (chunk) => {
      const line = chunk
        .split("\n")
        .find((item) => item.startsWith("data: "));

      if (!line) return { done: false };

      const event = JSON.parse(line.replace("data: ", ""));

      if (event.type === "progress") {
        appendProgress(event.message);
        return { done: false };
      }

      if (event.type === "result") {
        const normalizedResults = normalizeResults(event);
        if (normalizedResults.length === 0) {
          throw new Error("Analiz tamamlandı ama gösterilecek sonuç bulunamadı.");
        }

        hasResult = true;
        setAnalysisData(normalizedResults);
        appendProgress("🎉 Analiz tamamlandı, sonuçlar listeleniyor.");
        return { done: false };
      }

      if (event.type === "error") {
        throw new Error(event.message || "Analiz sırasında bir hata oluştu.");
      }

      if (event.type === "done") {
        return { done: true };
      }

      return { done: false };
    };

    try {
      const response = await fetch("http://localhost:8000/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Sunucu stream yanıtı veremedi.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { value, done } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const state = processEventChunk(chunk);
          if (state.done) {
            streamDone = true;
            break;
          }
        }
      }

      const trailingChunks = buffer
        .split("\n\n")
        .map((item) => item.trim())
        .filter(Boolean);

      for (const chunk of trailingChunks) {
        const state = processEventChunk(chunk);
        if (state.done) break;
      }

      if (!hasResult) {
        throw new Error("Analiz bitti ama sonuç event'i alınamadı. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Analiz hatası:", error);
      setErrorMessage(error.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "40px", background: "#f4f7f6", minHeight: "100vh" }}>
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ color: "#5b3df5" }}>Nova Studio - AI Moda Kataloğu</h1>
      </header>

      <div
        className="upload-box"
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "15px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        <input
          type="text"
          placeholder="Video linkini buraya yapıştırın..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={{ width: "70%", padding: "15px", borderRadius: "10px", border: "1px solid #ddd" }}
        />
        <button
          className="primary-btn"
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            marginLeft: "15px",
            padding: "15px 30px",
            background: "#5b3df5",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          {loading ? "Nova AI Analiz Ediyor..." : "Analizi Başlat"}
        </button>
      </div>

      {loading && progressLogs.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
            padding: "14px 18px",
            borderRadius: "10px",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
          }}
        >
          <strong style={{ display: "block", marginBottom: "8px" }}>Canlı işlem durumu</strong>
          <div style={{ maxHeight: "160px", overflowY: "auto", fontSize: "14px", lineHeight: 1.5 }}>
            {progressLogs.map((log, idx) => (
              <div key={`${log}-${idx}`}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginBottom: "24px",
            padding: "14px 18px",
            borderRadius: "10px",
            background: "#fff1f2",
            color: "#b42318",
            border: "1px solid #fecdd3",
            textAlign: "center",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div className="output-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
        {analysisData.length > 0 ? (
          analysisData.map((item, index) => (
            <div
              key={index}
              className="active-output-card"
              style={{
                background: "white",
                padding: "25px",
                borderRadius: "15px",
                borderTop: "8px solid #5b3df5",
                boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  background: "#eef2ff",
                  color: "#5b3df5",
                  padding: "4px 10px",
                  borderRadius: "20px",
                }}
              >
                SANİYE {item.saniye ?? "-"}
              </span>
              <h3 style={{ color: "#222", margin: "15px 0" }}>{item.urun || "Ürün bilgisi yok"}</h3>
              <p>
                <strong>🏷️ Marka:</strong> {item.marka || "Bilinmiyor"}
              </p>
              <p>
                <strong>✨ Detay:</strong> {item.detay || "Detay bilgisi yok"}
              </p>
              <div
                style={{
                  marginTop: "20px",
                  padding: "10px",
                  background: "#f0f4ff",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#5b3df5",
                  textAlign: "center",
                }}
              >
                TITAN V2 EMBEDDING: HAZIR
              </div>
            </div>
          ))
        ) : (
          !loading && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "50px", color: "#999" }}>
              Link yapıştırın ve analizi başlatın. Kartlar burada listelenecek.
            </div>
          )
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
