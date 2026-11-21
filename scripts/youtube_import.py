#!/usr/bin/env python3
"""Run a private subtitle importer for the Council Check Worker."""

import hmac
import json
import os
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import BoundedSemaphore
from urllib.parse import parse_qs, urlsplit

MAX_SUBTITLE_BYTES = 12 * 1024 * 1024
SLOTS = BoundedSemaphore(2)


def validate(payload):
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")
    video_id = payload.get("videoId")
    start, end = payload.get("fromSeconds"), payload.get("toSeconds")
    if not isinstance(video_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("Invalid video ID")
    if type(start) is not int or type(end) is not int or not (0 <= start < end <= 86400 and end - start <= 180):
        raise ValueError("Invalid interval")
    return video_id, start, end


def choose_track(info):
    def language_priority(language):
        base = language.split("-", 1)[0]
        return {"ca": 0, "es": 1, "en": 2}.get(base, 3), "-orig" not in language

    for tracks in (info.get("subtitles") or {}, info.get("automatic_captions") or {}):
        for language in sorted(tracks, key=language_priority):
            for track in tracks[language]:
                url = urlsplit(track.get("url", ""))
                if track.get("ext") == "json3" and url.scheme == "https" and "tlang" not in parse_qs(url.query):
                    return track
    return None


def crop_transcript(events, start, end):
    lines, passages = [], []
    offset = 0
    previous_words, previous_end = [], 0
    for event in events:
        begin = event.get("tStartMs")
        if type(begin) is not int or begin < 0:
            continue
        duration = event.get("dDurationMs")
        finish = begin + (duration if type(duration) is int and duration > 0 else 1)
        if begin >= end * 1000 or finish <= start * 1000:
            continue
        words = "".join(part.get("utf8", "") for part in event.get("segs", [])).split()
        if not words:
            continue
        overlap = 0
        if begin < previous_end:
            for size in range(min(len(previous_words), len(words)), 0, -1):
                if previous_words[-size:] == words[:size]:
                    overlap = size
                    break
        previous_words, previous_end = words, finish
        line = " ".join(words[overlap:])
        if not line:
            continue
        length = len(line.encode("utf-16-le")) // 2
        passages.append({"start": offset, "end": offset + length, "startSeconds": begin / 1000})
        lines.append(line)
        offset += length + 1
    return {"text": "\n".join(lines), "passages": passages}


def extract(payload):
    video_id, start, end = validate(payload)
    fixture_dir = os.environ.get("YOUTUBE_CAPTIONS_DIR")
    if fixture_dir:
        path = Path(fixture_dir) / f"{video_id}.json3"
        if path.is_file():
            with path.open("rb") as source:
                body = source.read(MAX_SUBTITLE_BYTES + 1)
            return transcript(body, start, end)

    from yt_dlp import YoutubeDL
    from yt_dlp.networking import Request

    options = {"quiet": True, "no_warnings": True, "noplaylist": True,
               "skip_download": True, "socket_timeout": 8, "extractor_retries": 0}
    with YoutubeDL(options) as downloader:
        info = downloader.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        track = choose_track(info)
        if not track:
            return None
        with downloader.urlopen(Request(track["url"], headers=track.get("http_headers"))) as response:
            body = response.read(MAX_SUBTITLE_BYTES + 1)
    return transcript(body, start, end, info["title"])


def transcript(body, start, end, title=None):
    if len(body) > MAX_SUBTITLE_BYTES:
        raise ValueError("Subtitle track too large")
    result = crop_transcript(json.loads(body).get("events", []), start, end)
    if not result["text"]:
        return None
    return {**result, **({"title": title} if title else {})}


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self.reply(200, {"status": "ok"})
        return self.reply(404, {"error": "Route not found"})

    def do_POST(self):
        self.connection.settimeout(5)
        if self.path != "/youtube":
            return self.reply(404, {"error": "Route not found"})
        expected = ("Bearer " + os.environ["YOUTUBE_IMPORT_TOKEN"]).encode()
        actual = self.headers.get("Authorization", "").encode()
        if not hmac.compare_digest(actual, expected):
            return self.reply(401, {"error": "Unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 2048:
                raise ValueError("Invalid payload size")
            payload = json.loads(self.rfile.read(size))
            validate(payload)
        except (ValueError, TimeoutError):
            return self.reply(400, {"error": "Invalid video request"})
        if not SLOTS.acquire(blocking=False):
            return self.reply(503, {"error": "Importer busy"})
        try:
            result = subprocess.run(
                [sys.executable, __file__, "--extract"],
                input=json.dumps(payload), text=True, capture_output=True, timeout=24, check=True,
            )
            transcript = json.loads(result.stdout)
        except (subprocess.SubprocessError, ValueError) as error:
            # Avoid logging request headers or signed subtitle URLs.
            self.log_error("Subtitle extraction failed: %s", type(error).__name__)
            return self.reply(503, {"error": "Subtitle retrieval failed"})
        finally:
            SLOTS.release()
        if transcript is None:
            return self.reply(422, {"error": "No subtitles in the requested interval"})
        return self.reply(200, transcript)


if __name__ == "__main__":
    if sys.argv[1:] == ["--extract"]:
        print(json.dumps(extract(json.load(sys.stdin))))
    else:
        if not os.environ.get("YOUTUBE_IMPORT_TOKEN"):
            sys.exit("Set YOUTUBE_IMPORT_TOKEN before starting the importer")
        host = os.environ.get("YOUTUBE_IMPORT_HOST", "127.0.0.1")
        port = int(os.environ.get("YOUTUBE_IMPORT_PORT", "8791"))
        ThreadingHTTPServer((host, port), Handler).serve_forever()
