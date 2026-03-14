from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import json
import queue
import threading
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

@app.post("/analyze/stream")
async def analyze_stream(request: AnalyzeRequest):
    def event_generator():
        progress_queue: queue.Queue[dict] = queue.Queue()

        def emit_progress(message: str):
            progress_queue.put({"type": "progress", "message": message})

        def worker():
            try:
                s3_uri = indir_ve_s3_yukle(request.url, progress_callback=emit_progress)
                if not s3_uri:
                    progress_queue.put({"type": "error", "message": "Video indirilemedi."})
                    return

                analiz_sonuclari = video_analiz_et(s3_uri, progress_callback=emit_progress)
                progress_queue.put({"type": "result", "results": analiz_sonuclari if analiz_sonuclari else []})
            except Exception as e:
                progress_queue.put({"type": "error", "message": str(e)})
            finally:
                progress_queue.put({"type": "done"})

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()

        while True:
            event = progress_queue.get()
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event.get("type") == "done":
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
