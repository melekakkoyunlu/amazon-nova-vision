const { useState } = React;

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState([]);

  const handleAnalyze = async () => {
    if (!videoUrl) return;
    setLoading(true);
    setAnalysisData([]); // Eski verileri temizle
    
    try {
      // Backend'e direkt bağlanıyoruz
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl })
      });
      
      const result = await response.json();
      
      // VERİ GELDİĞİ ANDA EKRANA BASIYORUZ
      if (result && result.status === "success" && result.results) {
        setAnalysisData(result.results);
      }
    } catch (error) {
      console.error("Bağlantı koptu ama veri gelmiş olabilir. Terminali kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{padding: '40px', background: '#f4f7f6', minHeight: '100vh'}}>
      <header style={{textAlign: 'center', marginBottom: '50px'}}>
        <h1 style={{color: '#5b3df5'}}>Nova Studio - AI Moda Kataloğu</h1>
      </header>

      <div className="upload-box" style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', marginBottom: '40px'}}>
        <input 
          type="text" 
          placeholder="Video linkini buraya yapıştırın..." 
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={{width: '70%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd'}}
        />
        <button className="primary-btn" onClick={handleAnalyze} disabled={loading} style={{marginLeft: '15px', padding: '15px 30px', background: '#5b3df5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer'}}>
          {loading ? "Nova AI Analiz Ediyor..." : "Analizi Başlat"}
        </button>
      </div>

      <div className="output-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
        {analysisData.length > 0 ? (
          analysisData.map((item, index) => (
            <div key={index} className="active-output-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', borderTop: '8px solid #5b3df5', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
              <span style={{fontSize: '12px', background: '#eef2ff', color: '#5b3df5', padding: '4px 10px', borderRadius: '20px'}}>SANİYE {item.saniye}</span>
              <h3 style={{ color: "#222", margin: "15px 0" }}>{item.urun}</h3>
              <p><strong>🏷️ Marka:</strong> {item.marka}</p>
              <p><strong>✨ Detay:</strong> {item.detay}</p>
              <div style={{marginTop: '20px', padding: '10px', background: '#f0f4ff', borderRadius: '8px', fontSize: '11px', color: '#5b3df5', textAlign: 'center'}}>
                TITAN V2 EMBEDDING: HAZIR
              </div>
            </div>
          ))
        ) : (
          !loading && <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#999'}}>Link yapıştırın ve analizi başlatın. Kartlar burada listelenecek.</div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);