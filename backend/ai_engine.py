import boto3
import json
import os
import cv2
import base64
from dotenv import load_dotenv
from pathlib import Path

# .env yükle
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Dosya yolu senkronizasyonu
BASE_DIR = Path(__file__).parent.parent
VIDEO_PATH = str(BASE_DIR / "gecici_video.mp4")

bedrock_client = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY")
)

def frame_to_base64(frame):
    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

def video_analiz_et(s3_uri: str):
    """Yereldeki videoyu karelere bölüp analiz eder."""
    if not os.path.exists(VIDEO_PATH):
        print(f"❌ Dosya bulunamadı: {VIDEO_PATH}")
        return [{"hata": "Video dosyası yerelde bulunamadı."}]

    vidcap = cv2.VideoCapture(VIDEO_PATH)
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30 # Hata payı
    
    analiz_sonuclari = []
    count = 0
    
    print(f"🎞️ Analiz başlıyor... (FPS: {fps})")

    while True:
        success, image = vidcap.read()
        if not success: break

        # Her 1 saniyede 1 kare analiz et
        if count % int(fps) == 0:
            saniye = count // int(fps)
            base64_image = frame_to_base64(image)
            
            body = json.dumps({
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"image": {"format": "jpeg", "source": {"bytes": base64_image}}},
                            {"text": "Bu karedeki moda ürününü JSON olarak döndür: {'urun': '...', 'detay': '...'}"}
                        ]
                    }
                ],
                "inferenceConfig": {"max_new_tokens": 300, "temperature": 0.2}
            })

            # ai_engine.py içindeki try bloğunu bu hale getirin:
            try:
                response = bedrock_client.invoke_model(
                    modelId="us.amazon.nova-lite-v1:0", 
                    body=body
                )
                res_body = json.loads(response['body'].read())
                tespit_raw = res_body['output']['message']['content'][0]['text']
                
                # Markdown temizleme (```json ... ``` kısımlarını atar)
                tespit_clean = tespit_raw.replace("```json", "").replace("```", "").strip()
                
                try:
                    tespit_json = json.loads(tespit_clean)
                    analiz_sonuclari.append({"saniye": saniye, **tespit_json})
                except:
                    # JSON parse edilemezse ham haliyle kaydet
                    analiz_sonuclari.append({"saniye": saniye, "urun": "Tespit", "detay": tespit_clean})
                
                print(f"✅ Saniye {saniye} temizlendi ve eklendi.")
            except Exception as e:
                print(f"⚠️ Hata sn {saniye}: {e}")

        count += 1
        if count > fps * 10: break # Hackathon için ilk 10 saniye sınırı

    vidcap.release()
    
    # İşlem bitince temizlik yapabiliriz
    if os.path.exists(VIDEO_PATH):
        os.remove(VIDEO_PATH)
        print("🧹 Geçici video silindi.")
        
    return analiz_sonuclari