# URL'den indirme ve S3 yükleme fonksiyonları

import yt_dlp
import boto3
import os
from dotenv import load_dotenv

load_dotenv() # .env dosyasındaki AWS bilgilerini okur

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
    region_name=os.getenv("AWS_REGION")
)

def indir_ve_s3_yukle(url: str):
    bucket_name = os.getenv("S3_BUCKET_NAME")
    output_filename = "gecici_video.mp4"
    
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_filename,
    }

    try:
        print(f"📥 Linkten video indiriliyor: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        s3_key = f"temp_videos/{output_filename}"
        print(f"☁️ S3'e yükleniyor: {bucket_name}/{s3_key}")
        
        s3_client.upload_file(output_filename, bucket_name, s3_key)
        
        if os.path.exists(output_filename):
            os.remove(output_filename) # Bilgisayardaki kopyayı siler, yer kaplamaz
            
        return f"s3://{bucket_name}/{s3_key}"
    except Exception as e:
        print(f"❌ Hata: {e}")
        return None