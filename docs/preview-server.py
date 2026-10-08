#!/usr/bin/env python3
"""Local-only QA server. Generated test captures are confined to ../qa-results."""
import os, json, base64, re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=Path(__file__).resolve().parent.parent
os.chdir(ROOT)
class QAHandler(SimpleHTTPRequestHandler):
 def do_POST(self):
  if self.path!='/__qa_artifact': self.send_error(404); return
  try:
   n=int(self.headers.get('Content-Length','0'))
   if n>20000000: raise ValueError('capture too large')
   data=json.loads(self.rfile.read(n)); name=data['name']
   if not re.fullmatch(r'[a-zA-Z0-9_.-]+\.(png|json|txt)',name): raise ValueError('invalid name')
   out=ROOT/'qa-results'; out.mkdir(exist_ok=True)
   raw=base64.b64decode(data['base64']) if 'base64' in data else data['text'].encode()
   (out/name).write_bytes(raw)
   self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
  except Exception as e: self.send_error(400,str(e))
ThreadingHTTPServer(('127.0.0.1',8874),QAHandler).serve_forever()
