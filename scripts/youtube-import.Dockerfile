FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 YOUTUBE_IMPORT_HOST=0.0.0.0
WORKDIR /app
COPY requirements-youtube.txt .
RUN pip install --no-cache-dir -r requirements-youtube.txt
COPY youtube_import.py .
USER 65532:65532
EXPOSE 8791
CMD ["python", "youtube_import.py"]
