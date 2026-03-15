import yt_dlp
import boto3
import os
from typing import Callable, Optional
from dotenv import load_dotenv
from pathlib import Path

# .env dosyasının yolunu kesinleştiriyoruz
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Proje kök dizini ve video yolu tanımları
BASE_DIR = Path(__file__).parent.parent
VIDEO_PATH = str(BASE_DIR / "gecici_video.mp4")

# AWS Bilgilerini Güvenli Şekilde Al
REGION = os.getenv("AWS_REGION", "us-east-1")
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
SECRET_KEY = os.getenv("AWS_SECRET_KEY")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# S3 Client Bağlantısı
s3_client = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name=REGION
)

def indir_ve_s3_yukle(url: str, progress_callback: Optional[Callable[[str], None]] = None):
    """URL'den videoyu indirir ve S3'e yükler."""
    # Eski dosya varsa temizle
    if os.path.exists(VIDEO_PATH):
        try:
            os.remove(VIDEO_PATH)
        except:
            pass

    ydl_opts = {
        'format': 'best[ext=mp4]',
        'outtmpl': VIDEO_PATH,
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        log_line = f"📥 Linkten video indiriliyor: {url}"
        print(log_line)
        if progress_callback:
            progress_callback(log_line)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        if not os.path.exists(VIDEO_PATH):
            raise Exception("Video dosyası indirilemedi.")

        s3_key = "temp_videos/gecici_video.mp4"
        log_line = f"☁️ S3'e yükleniyor: {BUCKET_NAME}/{s3_key}"
        print(log_line)
        if progress_callback:
            progress_callback(log_line)
        
        s3_client.upload_file(VIDEO_PATH, BUCKET_NAME, s3_key)
        return f"s3://{BUCKET_NAME}/{s3_key}"
        
    except Exception as e:
        log_line = f"❌ İndirme/Yükleme Hatası: {str(e)}"
        print(log_line)
        if progress_callback:
            progress_callback(log_line)
        return None