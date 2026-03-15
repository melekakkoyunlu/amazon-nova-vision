import boto3
import json
import os
import cv2
import base64
from typing import Callable, Optional
from dotenv import load_dotenv
from pathlib import Path
from .prompts import FASHION_ANALYSIS_PROMPT

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

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

def video_analiz_et(s3_uri: str, progress_callback: Optional[Callable[[str], None]] = None):
    if not os.path.exists(VIDEO_PATH):
        return [{"hata": "Video dosyası yerelde bulunamadı."}]

    vidcap = cv2.VideoCapture(VIDEO_PATH)
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30

    analiz_sonuclari = []
    count = 0

    log_line = f"🎞️ Analiz başlıyor... (FPS: {int(fps)})"
    print(log_line)
    if progress_callback:
        progress_callback(log_line)

    try:
        while True:
            success, image = vidcap.read()
            if not success:
                break

            # Her saniyeden 1 kare al (count % fps)
            if count % int(fps) == 0:
                saniye = count // int(fps)
                base64_image = frame_to_base64(image)

                body = json.dumps({
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"image": {"format": "jpeg", "source": {"bytes": base64_image}}},
                                {"text": FASHION_ANALYSIS_PROMPT}
                            ]
                        }
                    ],
                    "inferenceConfig": {"max_new_tokens": 600, "temperature": 0.1}
                })

                try:
                    response = bedrock_client.invoke_model(
                        modelId="us.amazon.nova-lite-v1:0",
                        body=body
                    )
                    res_body = json.loads(response['body'].read())
                    tespit_raw = res_body['output']['message']['content'][0]['text']

                    # Markdown JSON bloklarını temizle
                    tespit_clean = tespit_raw.replace("```json", "").replace("```", "").strip()
                    
                    try:
                        tespit_json = json.loads(tespit_clean)
                        tespit_json["saniye"] = saniye
                        analiz_sonuclari.append(tespit_json)
                        log_line = f"✅ Saniye {saniye}: {tespit_json.get('urun', 'Tespit edildi')}"
                    except:
                        log_line = f"⚠️ Saniye {saniye}: JSON formatı bozuk geldi."
                    
                    if progress_callback:
                        progress_callback(log_line)
                        
                except Exception as e:
                    print(f"Bedrock Error: {e}")

            count += 1
            # Demo amaçlı ilk 10 saniyeyi analiz et (Üretimde kaldırılabilir)
            if count > fps * 10:
                break
    finally:
        vidcap.release()
        if os.path.exists(VIDEO_PATH):
            try:
                os.remove(VIDEO_PATH)
            except:
                pass

    return analiz_sonuclari