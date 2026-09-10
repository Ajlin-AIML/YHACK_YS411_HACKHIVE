"""
LandslideGuard AI - Web Application Runner
Starts the Flask server on http://localhost:5000
"""

import sys
import webbrowser
import threading
import time
from app import app

def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://localhost:5000")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("      LANDSLIDEGUARD AI - EARLY WARNING COMMAND CENTER")
    print("="*60)
    print("  Status: AI Model Online & Ready")
    print("  Server: Running on http://localhost:5000")
    print("  Press Ctrl+C to terminate the server.")
    print("="*60 + "\n")
    
    # Auto open browser for ease of hackathon demo
    threading.Thread(target=open_browser, daemon=True).start()
    
    app.run(host="127.0.0.1", port=5000, debug=False)
