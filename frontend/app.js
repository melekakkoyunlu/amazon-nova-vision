const { useState, useRef } = React;

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState([]); 
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);

  // BACKEND BAĞLANTISI
  const handleAnalyze = async () => {
    if (!videoUrl) return alert("Lütfen bir video linki girin!");
    
    setLoading(true);
    setAnalysisData([]);
    
    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl })
      });
      
      const result = await response.json();
      
      if (result.status === "success") {
        setAnalysisData(result.results);
        alert("Analiz Tamamlandı! Videoyu oynatarak gerçek zamanlı tespitleri görebilirsiniz.");
      } else {
        alert("Hata: " + result.message);
      }
    } catch (error) {
      alert("Backend bağlantı hatası! Sunucunun çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  // O saniyeye ait Nova Vision verisini bulur
  const currentItem = analysisData.find(item => Math.floor(currentTime) === item.saniye);

  return (
    <div className="page-shell container">
      <header className="header"><div className="logo">Nova Studio</div></header>

      <section className="hero">
        <div className="hero-text">
          <h1>E-Commerce Content Factory</h1>
          <p>Nova Lite ile saniyeler içinde moda analizi yapın ve ürün detaylarını çıkarın.</p>
          <div className="upload-box">
            <input 
              type="text" 
              className="secondary-btn" 
              style={{width: '100%', marginBottom: '15px', padding: '15px', borderRadius: '12px'}}
              placeholder="YouTube veya Video URL'sini buraya yapıştırın..." 
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <button className="primary-btn" onClick={handleAnalyze} disabled={loading}>
              {loading ? "Nova AI Analiz Ediyor..." : "Analizi Başlat"}
            </button>
          </div>
        </div>
      </section>

      <section className="processing-layout" id="demo">
        <div className="video-panel">
          <video ref={videoRef} className="demo-video" controls onTimeUpdate={handleTimeUpdate}>
            {/* Backend'den gelen video kaynağı veya girilen link */}
            <source src={videoUrl.includes('.mp4') ? videoUrl : ""} type="video/mp4" />
          </video>
          <div className="time-indicator">Saniye: <strong>{currentTime.toFixed(1)}s</strong></div>
        </div>

        <div className="output-panel">
          <div className="active-output-card">
            {currentItem ? (
              <>
                <span className="mini-tag">Nova Lite Tespiti</span>
                <h3>{currentItem.urun}</h3>
                <p><strong>Marka:</strong> {currentItem.marka}</p>
                <p><strong>Detay:</strong> {currentItem.detay}</p>
                <p><strong>Ortam:</strong> {currentItem.ortam}</p>
              </>
            ) : (
              <p>Analiz sonuçlarını canlı görmek için videoyu oynatın.</p>
            )}
          </div>

          <div className="timeline-list" style={{maxHeight: '300px', overflowY: 'auto'}}>
            {analysisData.map((item, idx) => (
              <div key={idx} className={`timeline-item ${Math.floor(currentTime) === item.saniye ? "active" : ""}`}>
                <div className="timeline-time">{item.saniye}s</div>
                <div className="timeline-content">
                  <h4>{item.urun}</h4>
                  <p>{item.marka}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);