const { useState } = React;

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [progressLogs, setProgressLogs] = useState([]);

  const handleAnalyze = async () => {
    if (!videoUrl) return;
    setLoading(true);
    setAnalysisData([]);
    setErrorMessage("");
    setProgressLogs(["⏳ Nova AI hazırlanıyor..."]);

    try {
      const response = await fetch("http://localhost:8000/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const event = JSON.parse(part.replace("data: ", ""));
            
            if (event.type === "progress") {
              setProgressLogs(prev => [...prev, event.message]);
            } else if (event.type === "result") {
              setAnalysisData(event.results || []);
            } else if (event.type === "error") {
              setErrorMessage(event.message);
            }
          }
        }
      }
    } catch (err) {
      setErrorMessage("Bağlantı hatası: Sunucuya ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header style={{ textAlign: "center", padding: "40px 0" }}>
        <h1 style={{ color: "#5b3df5", fontSize: "2.5rem" }}>Nova Studio</h1>
        <p style={{ color: "#666" }}>YouTube Videolarından Yapay Zeka ile Ürün Analizi</p>
      </header>

      <div className="upload-box">
        <input
          type="text"
          placeholder="YouTube Video Linki (örn: https://www.youtube.com/watch?v=...)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={{ width: "75%", padding: "15px", borderRadius: "10px", border: "1px solid #ddd" }}
        />
        <button
          className="primary-btn"
          onClick={handleAnalyze}
          disabled={loading}
          style={{ marginLeft: "10px", padding: "15px 30px" }}
        >
          {loading ? "Analiz Ediliyor..." : "Analizi Başlat"}
        </button>
      </div>

      {progressLogs.length > 0 && (
        <div style={{ background: "#eef2ff", padding: "20px", borderRadius: "10px", margin: "20px 0" }}>
          {progressLogs.slice(-3).map((log, i) => (
            <div key={i} style={{ color: "#5b3df5", fontSize: "14px" }}>{log}</div>
          ))}
        </div>
      )}

      {errorMessage && <div style={{ color: "red", textAlign: "center" }}>{errorMessage}</div>}

      <div className="output-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", marginTop: "30px" }}>
        {analysisData.map((item, idx) => (
          <div key={idx} className="active-output-card">
            <div className="mini-tag">SN: {item.saniye}</div>
            <h3 style={{ margin: "10px 0" }}>{item.urun}</h3>
            <p><strong>Marka:</strong> {item.marka}</p>
            <p><strong>Detay:</strong> {item.detay}</p>
            <p style={{ fontSize: "12px", color: "#888" }}>📍 {item.ortam}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);