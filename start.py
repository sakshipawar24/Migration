#!/usr/bin/env python
"""
Quick Start Script for PBIP UI-Driven Converter
Run this to start the complete application
"""

import subprocess
import sys
import os
import time
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    # Check Python packages
    try:
        import flask
        import flask_cors
        print("✅ Flask installed")
    except ImportError:
        print("❌ Flask not installed. Run: pip install -r requirements.txt")
        return False
    
    # Check if Node.js is available
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        print(f"✅ Node.js {result.stdout.strip()}")
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js")
        return False
    
    # Check if npm packages are installed
    if not (Path("metadata-ui") / "node_modules").exists():
        print("⚠️ Frontend dependencies not installed")
        print("   Run: cd metadata-ui && npm install")
        return False
    
    print("✅ All dependencies OK")
    return True

def start_backend():
    """Start Flask backend"""
    print("\n🚀 Starting Flask backend on port 5000...")
    backend = subprocess.Popen(
        ["python", "app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    return backend

def start_frontend():
    """Start React frontend"""
    print("🚀 Starting React frontend on port 3000...")
    frontend = subprocess.Popen(
        ["npm", "start"],
        cwd="metadata-ui",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=True  # Needed for Windows npm
    )
    return frontend

def main():
    print("=" * 60)
    print("PBIP UI-Driven Converter - Quick Start")
    print("=" * 60)
    
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install missing dependencies.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("Starting Application...")
    print("=" * 60)
    
    backend = start_backend()
    time.sleep(2)  # Give backend time to start
    
    frontend = start_frontend()
    
    print("\n✅ Application started!")
    print("\n📊 Access the application:")
    print("   Frontend: http://localhost:3000")
    print("   Backend API: http://localhost:5000")
    print("\n⌨️ Press Ctrl+C to stop both servers")
    
    try:
        # Keep running until user interrupts
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\n\n⏹️ Stopping servers...")
        backend.terminate()
        frontend.terminate()
        print("✅ Servers stopped")

if __name__ == "__main__":
    main()
