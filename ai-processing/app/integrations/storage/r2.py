import os

import boto3
from botocore.client import Config
from dotenv import load_dotenv


load_dotenv()


class R2Storage:

    def __init__(self):

        endpoint_url = os.getenv(
            "S3_API"
        )

        access_key_id = os.getenv(
            "R2_ACCESS_KEY_ID"
        )

        secret_access_key = os.getenv(
            "R2_SECRET_ACCESS_KEY"
        )

        bucket_name = os.getenv(
            "R2_BUCKET_NAME"
        )

        if not endpoint_url:
            raise RuntimeError(
                "R2_ENDPOINT_URL is not configured"
            )

        if not access_key_id:
            raise RuntimeError(
                "R2_ACCESS_KEY_ID is not configured"
            )

        if not secret_access_key:
            raise RuntimeError(
                "R2_SECRET_ACCESS_KEY is not configured"
            )

        if not bucket_name:
            raise RuntimeError(
                "R2_BUCKET_NAME is not configured"
            )

        self.bucket_name = bucket_name

        self.client = boto3.client(
            "s3",

            endpoint_url=endpoint_url,

            aws_access_key_id=access_key_id,

            aws_secret_access_key=secret_access_key,

            config=Config(
                signature_version="s3v4"
            ),
        )

    def upload_file(
        self,
        file_path: str,
        object_key: str,
        content_type: str = "image/jpeg",
    ) -> str:

        self.client.upload_file(
            file_path,
            self.bucket_name,
            object_key,
            ExtraArgs={
                "ContentType": content_type,
            },
        )

        return object_key