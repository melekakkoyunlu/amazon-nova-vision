const { useState } = React;

function normalizeResults(payload) {
  const tryParseJson = (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch (_) {
      return value;
    }
  };

  const parsedPayload = tryParseJson(payload);

  if (Array.isArray(parsedPayload)) return parsedPayload;
  if (!parsedPayload || typeof parsedPayload !== "object") return [];

  const candidates = [parsedPayload.results, parsedPayload.data, parsedPayload.items, parsedPayload.output];
  for (const candidate of candidates) {
    const parsedCandidate = tryParseJson(candidate);
    if (Array.isArray(parsedCandidate)) return parsedCandidate;
  }

  if (parsedPayload.urun || parsedPayload.marka || parsedPayload.detay) {
    return [parsedPayload];
  }

  return [];
}

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAnalyze = async () => {
    if (!videoUrl) return;
    setLoading(true);
    setAnalysisData([]);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      const result = await response.json();
      const normalizedResults = normalizeResults(result).map((item) => {
        if (typeof item === "string") {
          try {
            return JSON.parse(item);
          } catch (_) {
            return { urun: item };
          }
        }

        return item;
      });

      if (!response.ok || result?.status === "error") {
        throw new Error(result?.message || "Analiz sırasında bir hata oluştu.");
      }

      if (normalizedResults.length === 0) {
        throw new Error("Analiz tamamlandı ama gösterilecek sonuç bulunamadı.");
      }

      setAnalysisData(normalizedResults);
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

      {loading && (
        <div
          style={{
            gridColumn: "1/-1",
            textAlign: "center",
            padding: "24px 0 36px",
            color: "#5b3df5",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              margin: "0 auto 12px",
              border: "4px solid #d8d2ff",
              borderTop: "4px solid #5b3df5",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          ></div>
          Analiz sürüyor... Lütfen bekleyin.
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

const styleTag = document.createElement("style");
styleTag.innerHTML = "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
document.head.appendChild(styleTag);
