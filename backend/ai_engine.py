import boto3
import json
import os
import cv2
import base64
from typing import Callable, Optional
from dotenv import load_dotenv
from pathlib import Path

# Yeni eklediğimiz prompt dosyasını içeri alıyoruz
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

    log_line = f"🎞️ Analiz başlıyor... (FPS: {fps})"
    print(log_line)
    if progress_callback:
        progress_callback(log_line)

    while True:
        success, image = vidcap.read()
        if not success:
            break

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
                "inferenceConfig": {"max_new_tokens": 500, "temperature": 0.2}
            })

            try:
                response = bedrock_client.invoke_model(
                    modelId="us.amazon.nova-lite-v1:0",
                    body=body
                )
                res_body = json.loads(response['body'].read())
                tespit_raw = res_body['output']['message']['content'][0]['text']

                tespit_clean = tespit_raw.replace("```json", "").replace("```", "").strip()

                try:
                    tespit_json = json.loads(tespit_clean)
                    analiz_sonuclari.append({"saniye": saniye, **tespit_json})
                except Exception:
                    analiz_sonuclari.append({"saniye": saniye, "urun": "Hata", "detay": "JSON ayrıştırılamadı"})

                log_line = f"✅ Saniye {saniye} analiz edildi."
                print(log_line)
                if progress_callback:
                    progress_callback(log_line)
            except Exception as e:
                log_line = f"⚠️ Hata sn {saniye}: {e}"
                print(log_line)
                if progress_callback:
                    progress_callback(log_line)

        count += 1
        if count > fps * 10:
            break

    vidcap.release()
    if os.path.exists(VIDEO_PATH):
        os.remove(VIDEO_PATH)

    return analiz_sonuclari
