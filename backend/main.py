from fastapi import FastAPI
from pydantic import BaseModel
from .processor import indir_ve_s3_yukle
from .ai_engine import video_analiz_et

app = FastAPI()

class AnalyzeRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "Amazon Nova Vision API Online"}

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    # 1. Önce videoyu indir ve S3'e at
    s3_uri = indir_ve_s3_yukle(request.url)
    
    if not s3_uri:
        return {"error": "Video işlenemedi"}

    # 2. Nova ile analiz et
    analiz_sonucu = video_analiz_et(s3_uri)
    
    return {"s3_uri": s3_uri, "analysis": analiz_sonucu}