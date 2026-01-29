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
print("\n📦 Test 1: Python Dependencies")
try:
    import flask
    import flask_cors
    from werkzeug.utils import secure_filename
    print("✅ Flask and extensions installed")
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("   Run: pip install -r requirements.txt")
    sys.exit(1)

# Test 2: Node.js
print("\n📦 Test 2: Node.js")
import subprocess
try:
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    print(f"✅ Node.js {result.stdout.strip()}")
except FileNotFoundError:
    print("❌ Node.js not found")
    print("   Install from: https://nodejs.org/")
    sys.exit(1)

# Test 3: Frontend Dependencies
print("\n📦 Test 3: Frontend Dependencies")
if (Path("metadata-ui") / "node_modules").exists():
    print("✅ Frontend dependencies installed")
else:
    print("⚠️  Frontend dependencies not installed")
    print("   Run: cd metadata-ui && npm install")

# Test 4: Python Scripts
print("\n📄 Test 4: Python Scripts")
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
        print(f"✅ {script}")
    else:
        print(f"❌ {script} missing")
        all_exist = False

if not all_exist:
    print("   Some required scripts are missing!")
    sys.exit(1)

# Test 5: Import Python Modules
print("\n🔬 Test 5: Python Module Imports")
try:
    import metadatacollection
    print("✅ metadatacollection.py")
    
    # Check if function exists
    if hasattr(metadatacollection, 'collect_metadata'):
        print("✅ collect_metadata() function found")
    else:
        print("⚠️  collect_metadata() function not found")
except Exception as e:
    print(f"❌ Error importing metadatacollection: {e}")

# Test 6: Directory Structure
print("\n📁 Test 6: Directory Structure")
required_dirs = [
    "metadata-ui/src",
    "metadata-ui/src/components",
    "metadata-ui/public"
]

for dir_path in required_dirs:
    if Path(dir_path).exists():
        print(f"✅ {dir_path}")
    else:
        print(f"❌ {dir_path} missing")

# Test 7: React Components
print("\n⚛️  Test 7: React Components")
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
        print(f"✅ {Path(component).name}")
    else:
        print(f"❌ {Path(component).name} missing")

# Test 8: Upload Directory
print("\n📤 Test 8: Upload Directory")
upload_dir = Path("uploads")
if not upload_dir.exists():
    upload_dir.mkdir()
    print("✅ Created uploads/ directory")
else:
    print("✅ uploads/ directory exists")

# Test 9: Sample PBIP (Optional)
print("\n📊 Test 9: Sample PBIP (Optional)")
sample_pbip = Path("Synapse 01 (Self-Serve).SemanticModel")
if sample_pbip.exists():
    print("✅ Sample PBIP found")
    tables_dir = sample_pbip / "definition" / "tables"
    if tables_dir.exists():
        tmdl_files = list(tables_dir.glob("*.tmdl"))
        print(f"✅ Found {len(tmdl_files)} .tmdl files")
    else:
        print("⚠️  definition/tables directory not found")
else:
    print("⚠️  Sample PBIP not found (OK if using your own)")

# Test 10: Port Availability
print("\n🔌 Test 10: Port Availability")
import socket

def check_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result != 0  # True if port is free

if check_port(5000):
    print("✅ Port 5000 (Backend) available")
else:
    print("⚠️  Port 5000 in use (Backend may fail to start)")

if check_port(3000):
    print("✅ Port 3000 (Frontend) available")
else:
    print("⚠️  Port 3000 in use (Frontend may fail to start)")

# Summary
print("\n" + "=" * 70)
print("📋 Test Summary")
print("=" * 70)
print("✅ All critical tests passed!")
print("\n🚀 You're ready to start the application:")
print("   Option 1: python start.py")
print("   Option 2: python app.py (then cd metadata-ui && npm start)")
print("\n📖 For usage instructions, see QUICKSTART.md")
print("=" * 70)
