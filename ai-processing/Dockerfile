FROM python:3.12-slim

WORKDIR /ai-processing

COPY  requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends libxcb1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

COPY ./app ./app/

CMD [ "fastapi","dev","app/main.py", "--host", "0.0.0.0","--port","8000" ]
