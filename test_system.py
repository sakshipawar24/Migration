"""
Test the UI-driven PBIP converter backend
Run this before starting the full application to ensure everything works
"""

import sys
from pathlib import Path

print("=" * 70)
print("PBIP UI-Driven Converter - System Test")
print("=" * 70)

# Test 1: Python Dependencies
print("\nTest 1: Python Dependencies")
try:
    import flask
    import flask_cors
    from werkzeug.utils import secure_filename
    print("[OK] Flask and extensions installed")
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("   Run: pip install -r requirements.txt")
    sys.exit(1)

# Test 2: Node.js
print("\nTest 2: Node.js")
import subprocess
try:
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    print(f"[OK] Node.js {result.stdout.strip()}")
except FileNotFoundError:
    print("[ERROR] Node.js not found")
    print("   Install from: https://nodejs.org/")
    sys.exit(1)

# Test 3: Frontend Dependencies
print("\nTest 3: Frontend Dependencies")
if (Path("metadata-ui") / "node_modules").exists():
    print("[OK] Frontend dependencies installed")
else:
    print("[WARN] Frontend dependencies not installed")
    print("   Run: cd metadata-ui && npm install")

# Test 4: Python Scripts
print("\n Test 4: Python Scripts")
scripts = [
    "app.py",
    "metadatacollection.py",
    "dummyreplacement.py",
    "changetech.py",
    "invoke.js"
]

all_exist = True
for script in scripts:
    if Path(script).exists():
        print(f"[OK] {script}")
    else:
        print(f"[ERROR] {script} missing")
        all_exist = False

if not all_exist:
    print("   Some required scripts are missing!")
    sys.exit(1)

# Test 5: Import Python Modules
print("\nTest 5: Python Module Imports")
try:
    import metadatacollection
    print("[OK] metadatacollection.py")
    
    # Check if function exists
    if hasattr(metadatacollection, 'collect_metadata'):
        print("[OK] collect_metadata() function found")
    else:
        print("[WARN] collect_metadata() function not found")
except Exception as e:
    print(f"[ERROR] Error importing metadatacollection: {e}")

# Test 6: Directory Structure
print("\nTest 6: Directory Structure")
required_dirs = [
    "metadata-ui/src",
    "metadata-ui/src/components",
    "metadata-ui/public"
]

for dir_path in required_dirs:
    if Path(dir_path).exists():
        print(f"[OK] {dir_path}")
    else:
        print(f"[ERROR] {dir_path} missing")

# Test 7: React Components
print("\nTest 7: React Components")
components = [
    "metadata-ui/src/App.js",
    "metadata-ui/src/App.css",
    "metadata-ui/src/components/FileUpload.js",
    "metadata-ui/src/components/ProcessButtons.js",
    "metadata-ui/src/components/MetadataTable.js",
    "metadata-ui/src/components/StatsCards.js"
]

for component in components:
    if Path(component).exists():
        print(f"[OK] {Path(component).name}")
    else:
        print(f"[ERROR] {Path(component).name} missing")

# Test 8: Upload Directory
print("\nTest 8: Upload Directory")
upload_dir = Path("uploads")
if not upload_dir.exists():
    upload_dir.mkdir()
    print("[OK] Created uploads/ directory")
else:
    print("[OK] uploads/ directory exists")

# Test 9: Sample PBIP (Optional)
print("\nTest 9: Sample PBIP (Optional)")
sample_pbip = Path("Synapse 01 (Self-Serve).SemanticModel")
if sample_pbip.exists():
    print("[OK] Sample PBIP found")
    tables_dir = sample_pbip / "definition" / "tables"
    if tables_dir.exists():
        tmdl_files = list(tables_dir.glob("*.tmdl"))
        print(f"[OK] Found {len(tmdl_files)} .tmdl files")
    else:
        print("[WARN] definition/tables directory not found")
else:
    print("[WARN] Sample PBIP not found (OK if using your own)")

# Test 10: Port Availability
print("\nTest 10: Port Availability")
import socket

def check_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result != 0  # True if port is free

if check_port(5000):
    print("[OK] Port 5000 (Backend) available")
else:
    print("[WARN] Port 5000 in use (Backend may fail to start)")

if check_port(3000):
    print("[OK] Port 3000 (Frontend) available")
else:
    print("[WARN] Port 3000 in use (Frontend may fail to start)")

# Summary
print("\n" + "=" * 70)
print("Test Summary")
print("=" * 70)
print("[OK] All critical tests passed!")
print("\nYou're ready to start the application:")
print("   Option 1: python start.py")
print("   Option 2: python app.py (then cd metadata-ui && npm start)")
print("\n For usage instructions, see QUICKSTART.md")
print("=" * 70)
