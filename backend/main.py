from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from .processor import indir_ve_s3_yukle
from .ai_engine import video_analiz_et

app = FastAPI()

# GÜVENLİK DUVARINI YIKIYORUZ: Frontend'in veriye ulaşması için şart
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "Amazon Nova Vision API Online"}

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        # 1. Video İndir ve S3'e yükle
        s3_uri = indir_ve_s3_yukle(request.url)
        if not s3_uri:
            return {"status": "error", "message": "Video indirilemedi."}

        # 2. Nova Analizi
        analiz_sonuclari = video_analiz_et(s3_uri)
        
        # 3. Sonucu Frontend'e Gönder (JSON Formatı)
        return {
            "status": "success",
            "results": analiz_sonuclari if analiz_sonuclari else []
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)