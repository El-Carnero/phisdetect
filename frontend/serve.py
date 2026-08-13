#!/usr/bin/env python3
"""Development static server for PhisDetect.

Serves the frontend on http://localhost:8000 with caching disabled so the
browser always picks up the latest JS/CSS (no more stale cached scripts).

Usage:
    python serve.py            # http://localhost:8000
"""

import http.server
import os
import socketserver

PORT = int(os.environ.get("PORT", "8000"))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith("/js/") or self.path.startswith("/css/"):
            print("[serve]", self.command, self.path, flush=True)


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with ThreadingServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"PhisDetect frontend running at http://localhost:{PORT} (caching disabled)")
        httpd.serve_forever()
