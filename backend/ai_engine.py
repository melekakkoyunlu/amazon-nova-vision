# Nova (Bedrock) çağrıları ve Promptlar

import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

bedrock_client = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY")
)

def video_analiz_et(s3_uri: str):
    # 2. Kişinin düzenleyeceği ana prompt
    prompt_text = """
    Bu videodaki tüm objeleri/ürünleri tespit et. 
    Her birini saniye, kategori ve isim olarak JSON formatında liste halinde ver.
    """

    body = json.dumps({
        "messages": [
            {
                "role": "user",
                "content": [
                    {"video": {"s3Location": {"uri": s3_uri}}},
                    {"text": prompt_text}
                ]
            }
        ]
    })

    try:
        response = bedrock_client.invoke_model(
            modelId="us.amazon.nova-lite-v1:0",
            body=body
        )
        response_body = json.loads(response['body'].read())
        return response_body['output']['message']['content'][0]['text']
    except Exception as e:
        return f"Analiz Hatası: {str(e)}"