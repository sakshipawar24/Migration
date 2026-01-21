"""
Flask Backend API for PBIP Metadata Viewer
Serves metadata from CSV files to React frontend
"""

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import csv
import os
from pathlib import Path

app = Flask(__name__, static_folder='metadata-ui/build')
CORS(app)

# Path to metadata CSV
METADATA_FILE = "pbip_master_metadata.csv"


@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """Get all metadata from master CSV"""
    try:
        metadata = []
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                metadata = list(reader)
        
        return jsonify({
            'success': True,
            'count': len(metadata),
            'data': metadata
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about the metadata"""
    try:
        metadata = []
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                metadata = list(reader)
        
        # Calculate statistics
        total_tables = len(metadata)
        connection_types = {}
        before_sources = {}
        after_sources = {}
        
        for row in metadata:
            # Count connection types
            conn_type = row.get('Connection_Type', 'Unknown')
            connection_types[conn_type] = connection_types.get(conn_type, 0) + 1
            
            # Count before sources
            before_src = row.get('Before_Source', 'Unknown')
            before_sources[before_src] = before_sources.get(before_src, 0) + 1
            
            # Count after sources
            after_src = row.get('After_Source', 'Unknown')
            after_sources[after_src] = after_sources.get(after_src, 0) + 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_tables': total_tables,
                'connection_types': connection_types,
                'before_sources': before_sources,
                'after_sources': after_sources
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


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
    print(f"Metadata file: {METADATA_FILE}")
    app.run(debug=True, port=5000, host='0.0.0.0')
