"""
Frozen entrypoint for the face validator.

The desktop app normally launches this service with `python -m uvicorn app.main:app`,
but a PyInstaller-frozen exe has no `-m` mechanism. This module starts uvicorn
in-process so the same FastAPI app runs from a standalone face-service.exe.

Port comes from FACE_PORT (set by electron/main.js); defaults to 8500.
Host is fixed to 0.0.0.0 so other PCs on the LAN can reach it, matching the
arguments main.js passes in dev.
"""

import os

import uvicorn

# Import the app object directly (not the "app.main:app" import string) so that
# when frozen, uvicorn runs in-process and never tries to re-exec the bundle.
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("FACE_PORT", "8500"))
    uvicorn.run(app, host="0.0.0.0", port=port, workers=1, log_level="info")
