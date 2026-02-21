import yt_dlp
import boto3
import os
from dotenv import load_dotenv
from pathlib import Path

# .env dosyasının yolunu kesinleştiriyoruz
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Klasör yapısını garantiye al (Videonun ana dizine inmesi için)
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

def indir_ve_s3_yukle(url: str):
    """URL'den videoyu indirir ve S3'e yükler."""
    ydl_opts = {
        'format': 'best[ext=mp4]',
        'outtmpl': VIDEO_PATH, # Tam yolu kullanıyoruz
        'noplaylist': True,
    }

    try:
        print(f"📥 Linkten video indiriliyor: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        s3_key = f"temp_videos/gecici_video.mp4"
        print(f"☁️ S3'e yükleniyor: {BUCKET_NAME}/{s3_key}")
        
        s3_client.upload_file(VIDEO_PATH, BUCKET_NAME, s3_key)
        
        # Analiz bitene kadar dosyayı SİLMİYORUZ.
        return f"s3://{BUCKET_NAME}/{s3_key}"
        
    except Exception as e:
        print(f"❌ İndirme/Yükleme Hatası: {e}")
        return None