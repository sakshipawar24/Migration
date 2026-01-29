"""
Flask Backend API for PBIP Metadata Viewer
UI-driven PBIP processing with file upload and two-button flow
"""

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import csv
import os
import subprocess
import json
from pathlib import Path
from werkzeug.utils import secure_filename
import shutil
import zipfile
import tempfile

app = Flask(__name__, static_folder='metadata-ui/build')
CORS(app)

# Configuration
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# State storage
app_state = {
    'pbip_path': None,
    'workspace_name': None,
    'target_system': None,
    'before_metadata': [],
    'after_metadata': []
}


@app.route('/api/upload-pbip', methods=['POST'])
def upload_pbip():
    """Upload and extract PBIP folder"""
    try:
        if 'pbipFolder' not in request.files:
            return jsonify({'success': False, 'error': 'No folder uploaded'}), 400
        
        files = request.files.getlist('pbipFolder')
        workspace_name = request.form.get('workspaceName', 'Workspace')
        target_system = request.form.get('targetSystem', 'Fabric')
        
        # Clear previous uploads
        for item in UPLOAD_FOLDER.iterdir():
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
        
        # Save uploaded files preserving structure
        pbip_root = None
        semantic_model_folder = None
        
        for file in files:
            if file.filename:
                # Preserve relative path structure
                file_path = file.filename.replace('\\', '/')
                filepath = UPLOAD_FOLDER / file_path
                filepath.parent.mkdir(parents=True, exist_ok=True)
                file.save(str(filepath))
                
                # Find the .SemanticModel folder
                if '.SemanticModel' in file_path:
                    # Extract the semantic model folder path
                    parts = file_path.split('/')
                    for i, part in enumerate(parts):
                        if part.endswith('.SemanticModel'):
                            semantic_model_folder = '/'.join(parts[:i+1])
                            break
        
        if not semantic_model_folder:
            return jsonify({'success': False, 'error': 'No .SemanticModel folder found in upload'}), 400
        
        pbip_root = str(UPLOAD_FOLDER / semantic_model_folder)
        
        # Verify tables directory exists
        tables_check = Path(pbip_root) / 'definition' / 'tables'
        if not tables_check.exists():
            return jsonify({
                'success': False, 
                'error': f'Invalid PBIP structure. Tables directory not found at {tables_check}'
            }), 400
        
        app_state['pbip_path'] = pbip_root
        app_state['workspace_name'] = workspace_name
        app_state['target_system'] = target_system
        
        return jsonify({
            'success': True,
            'message': 'PBIP folder uploaded successfully',
            'pbip_path': pbip_root,
            'workspace_name': workspace_name,
            'target_system': target_system
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/convert-pbip', methods=['POST'])
def convert_pbip():
    """Step 1: Extract BEFORE metadata from uploaded PBIP"""
    try:
        data = request.get_json()
        pbip_path = data.get('pbipPath') or app_state.get('pbip_path')
        workspace_name = data.get('workspaceName') or app_state.get('workspace_name')
        target_system = data.get('targetSystem') or app_state.get('target_system', 'Fabric')
        
        if not pbip_path:
            return jsonify({'success': False, 'error': 'No PBIP path provided'}), 400
        
        # Run metadata collection for BEFORE state
        result = subprocess.run(
            ['python', 'metadatacollection.py', pbip_path, 'before'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            return jsonify({'success': False, 'error': result.stderr}), 500
        
        # Read the generated metadata
        metadata_file = 'pbip_before_metadata.csv'
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                before_metadata = list(reader)
            
            app_state['before_metadata'] = before_metadata
            app_state['pbip_path'] = pbip_path
            
            return jsonify({
                'success': True,
                'message': 'PBIP converted - BEFORE metadata extracted',
                'metadata': before_metadata,
                'count': len(before_metadata)
            })
        else:
            return jsonify({'success': False, 'error': 'Metadata file not generated'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/change-connection', methods=['POST'])
def change_connection():
    """Step 2: Update PBIP connections and extract AFTER metadata"""
    try:
        data = request.get_json()
        pbip_path = data.get('pbipPath') or app_state.get('pbip_path')
        server = data.get('server', 'fabric_server')
        database = data.get('database', 'fabric_lakehouse')
        sql_query = data.get('sqlQuery', '')
        workspace_id = data.get('workspaceId', 'dummy_workspace_id')
        lakehouse_id = data.get('lakehouseId', 'dummy_lakehouse_id')
        
        if not pbip_path:
            return jsonify({'success': False, 'error': 'No PBIP loaded. Click "Convert PBIP" first.'}), 400
        
        # Run the transformation pipeline
        params = {
            'pbip_path': pbip_path,
            'server': server,
            'database': database,
            'workspace_id': workspace_id,
            'lakehouse_id': lakehouse_id,
            'sql_query': sql_query
        }
        
        # Save parameters for scripts
        with open('temp_params.json', 'w') as f:
            json.dump(params, f)
        
        # Run Node.js pipeline (which calls Python scripts)
        result = subprocess.run(
            ['node', 'invoke.js'],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            return jsonify({'success': False, 'error': result.stderr}), 500
        
        # Read AFTER metadata
        metadata_file = 'pbip_after_metadata.csv'
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                after_metadata = list(reader)
            
            app_state['after_metadata'] = after_metadata
            
            return jsonify({
                'success': True,
                'message': 'Connection updated - AFTER metadata extracted',
                'metadata': after_metadata,
                'count': len(after_metadata)
            })
        else:
            return jsonify({'success': False, 'error': 'After metadata file not generated'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """Get current metadata state"""
    try:
        metadata_type = request.args.get('type', 'before')
        
        if metadata_type == 'before':
            data = app_state.get('before_metadata', [])
        else:
            data = app_state.get('after_metadata', [])
        
        return jsonify({
            'success': True,
            'count': len(data),
            'data': data,
            'type': metadata_type
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about the metadata"""
    try:
        metadata_type = request.args.get('type', 'before')
        metadata = app_state.get(f'{metadata_type}_metadata', [])
        
        # Calculate statistics
        total_tables = len(metadata)
        connection_types = {}
        sources = {}
        
        for row in metadata:
            conn_type = row.get('Connection_Type', 'Unknown')
            connection_types[conn_type] = connection_types.get(conn_type, 0) + 1
            
            source = row.get(f'{metadata_type.title()}_Source', 'Unknown')
            sources[source] = sources.get(source, 0) + 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_tables': total_tables,
                'connection_types': connection_types,
                'sources': sources
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    print("Starting PBIP Metadata Viewer API...")
    print("Upload folder: uploads/")
    print("Backend running on http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')
