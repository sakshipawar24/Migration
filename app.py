"""
Flask Backend API for PBIP Metadata Viewer
UI-driven PBIP processing with file upload and two-button flow
"""

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import csv
import re
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
    'after_metadata': [],
    'pbix_output_path': None,
    'pbip_output_path': None,
    'pbi_tenant_id': None,
    'pbi_client_id': None,
    'pbi_client_secret': None,
    'pbi_source_workspace_id': None,
    'pbi_target_workspace_id': None,
    'pbi_pbix_folder': None
}

POWER_BI_SCRIPT = Path('automation') / 'Run-Migration.ps1'
PBI_TOOLS_PATH = Path(r"C:\Tools\pbi-tools\pbi-tools.exe")
POWER_BI_DESKTOP_PATH = Path(r"C:\Program Files\Microsoft Power BI Desktop\bin\PBIDesktop.exe")


def get_power_bi_env():
    tenant_id = app_state.get('pbi_tenant_id') or os.environ.get('POWERBI_TENANT_ID') or os.environ.get('PBI_TENANT_ID')
    client_id = app_state.get('pbi_client_id') or os.environ.get('POWERBI_CLIENT_ID') or os.environ.get('PBI_CLIENT_ID')
    client_secret = app_state.get('pbi_client_secret') or os.environ.get('POWERBI_CLIENT_SECRET') or os.environ.get('PBI_CLIENT_SECRET')
    return tenant_id, client_id, client_secret


def get_power_bi_config(data):
    tenant_id = data.get('tenantId') or app_state.get('pbi_tenant_id') or os.environ.get('POWERBI_TENANT_ID') or os.environ.get('PBI_TENANT_ID')
    client_id = data.get('clientId') or app_state.get('pbi_client_id') or os.environ.get('POWERBI_CLIENT_ID') or os.environ.get('PBI_CLIENT_ID')
    client_secret = data.get('clientSecret') or app_state.get('pbi_client_secret') or os.environ.get('POWERBI_CLIENT_SECRET') or os.environ.get('PBI_CLIENT_SECRET')
    source_workspace_id = data.get('sourceWorkspaceId') or app_state.get('pbi_source_workspace_id')
    target_workspace_id = data.get('targetWorkspaceId') or app_state.get('pbi_target_workspace_id')
    pbix_folder = data.get('pbixFolder') or app_state.get('pbi_pbix_folder') or r"D:\PBIX"
    return tenant_id, client_id, client_secret, source_workspace_id, target_workspace_id, pbix_folder


def run_power_bi_action(action, data, timeout=900):
    tenant_id, client_id, client_secret, source_workspace_id, target_workspace_id, pbix_folder = get_power_bi_config(data)

    if not tenant_id or not client_id or not client_secret:
        return None, 'Tenant ID, Client ID, and Client Secret are required.'

    if action in {'download', 'all'} and not source_workspace_id:
        return None, 'Source workspace ID is required for download.'

    if action in {'publish', 'refresh', 'all'} and not target_workspace_id:
        return None, 'Target workspace ID is required for publish/refresh.'

    if not POWER_BI_SCRIPT.exists():
        return None, 'Run-Migration.ps1 not found.'

    env_override = {
        'POWERBI_TENANT_ID': tenant_id,
        'POWERBI_CLIENT_ID': client_id,
        'POWERBI_CLIENT_SECRET': client_secret
    }

    pbip_folder = None
    if data:
        pbip_folder = data.get('pbipFolder')
    if not pbip_folder:
        pbip_folder = r"D:\PBIP"

    args = [
        f"-Action '{action}'",
        f"-PbixFolder '{pbix_folder}'",
        f"-PbipFolder '{pbip_folder}'"
    ]
    if source_workspace_id:
        args.append(f"-SourceWorkspace '{source_workspace_id}'")
    if target_workspace_id:
        args.append(f"-TargetWorkspace '{target_workspace_id}'")

    server = data.get('server') if data else None
    database = data.get('database') if data else None
    target_technology = data.get('targetTechnology') if data else None
    workspace_id = data.get('workspaceId') if data else None
    lakehouse_id = data.get('lakehouseId') if data else None
    transformed_pbix_folder = data.get('transformedPbixFolder') if data else None
    use_python = bool(data.get('usePython')) if data else False

    if server:
        args.append(f"-Server '{server}'")
    if database:
        args.append(f"-Database '{database}'")
    if target_technology:
        args.append(f"-TargetTechnology '{target_technology}'")
    if workspace_id:
        args.append(f"-WorkspaceId '{workspace_id}'")
    if lakehouse_id:
        args.append(f"-LakehouseId '{lakehouse_id}'")
    if transformed_pbix_folder:
        args.append(f"-TransformedPbixFolder '{transformed_pbix_folder}'")
    if use_python:
        args.append("-UsePython")

    command = f"& '{POWER_BI_SCRIPT.resolve()}' " + ' '.join(args)
    result = run_powershell(command, env_override=env_override, timeout=timeout)
    if result.returncode != 0:
        return None, result.stderr or result.stdout or 'Power BI action failed.'

    return result.stdout, None


def load_run_all_metadata(pbip_folder):
    metadata_dir = Path(pbip_folder) / '_metadata'
    if not metadata_dir.exists():
        return [], []

    before_rows = []
    after_rows = []

    for metadata_file in metadata_dir.glob('*.json'):
        try:
            report_name = metadata_file.stem
            report_key = normalize_report_name(report_name)
            payload = json.loads(metadata_file.read_text(encoding='utf-8'))
            before = payload.get('before', [])
            after = payload.get('after', [])

            for row in before:
                row_name = row.get('name') or ''
                row['reportName'] = report_key
                row['reportDisplay'] = report_key
                row['name'] = f"{report_key}::{row_name}" if row_name else report_key
                before_rows.append(row)

            for row in after:
                row_name = row.get('name') or ''
                row['reportName'] = report_key
                row['reportDisplay'] = report_key
                row['name'] = f"{report_key}::{row_name}" if row_name else report_key
                after_rows.append(row)
        except Exception:
            continue

    return before_rows, after_rows


def normalize_report_name(report_name):
    if not report_name:
        return ''

    return report_name.strip()


def parse_download_summary(output_text):
    if not output_text:
        return None

    match = re.search(r'DOWNLOAD_SUMMARY\|total=(\d+)\|downloaded=(\d+)\|skipped=(\d+)', output_text)
    if not match:
        return None

    total = int(match.group(1))
    downloaded = int(match.group(2))
    skipped = int(match.group(3))
    return {
        'total': total,
        'downloaded': downloaded,
        'skipped': skipped
    }


def normalize_connector_fields(row):
    m_query = (row.get('mQuery') or row.get('M_Query_Preview') or '')
    if not m_query:
        return row

    source = row.get('source')
    connection_type = row.get('connectionType')
    if source and source != 'Unknown' and connection_type:
        return row

    lower = m_query.lower()
    if 'lakehouse.contents' in lower:
        row['source'] = 'Fabric Lakehouse'
        row['connectionType'] = 'Lakehouse.Contents'
    elif 'sql.database' in lower:
        row['source'] = 'SQL Server'
        row['connectionType'] = 'Sql.Database'
    elif 'databricks.' in lower:
        row['source'] = 'Databricks'
        row['connectionType'] = 'Databricks'

    return row


def resolve_semantic_model_path(pbip_path: Path):
    if pbip_path.name.endswith('.SemanticModel'):
        return pbip_path, pbip_path.parent

    if (pbip_path / 'Model').is_dir() or (pbip_path / 'definition').is_dir():
        return pbip_path, pbip_path

    for item in pbip_path.iterdir():
        if item.is_dir() and item.name.endswith('.SemanticModel'):
            return item, pbip_path

    return pbip_path, pbip_path


def run_powershell(command, env_override=None, timeout=300):
    shell = shutil.which('pwsh') or shutil.which('powershell')
    if not shell:
        raise RuntimeError('PowerShell not found. Install PowerShell or ensure it is in PATH.')

    env = os.environ.copy()
    if env_override:
        env.update(env_override)

    result = subprocess.run(
        [shell, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
        capture_output=True,
        text=True,
        timeout=timeout,
        env=env
    )
    return result


def run_node_script(script_path, args=None, timeout=300):
    node = shutil.which('node')
    if not node:
        raise RuntimeError('Node.js not found. Install Node.js or ensure it is in PATH.')

    command = [node, str(script_path)]
    if args:
        command.extend(args)

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=timeout
    )
    return result


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
        found_semantic_model = False
        
        for file in files:
            if file.filename:
                # Preserve relative path structure
                file_path = file.filename.replace('\\', '/')
                filepath = UPLOAD_FOLDER / file_path
                filepath.parent.mkdir(parents=True, exist_ok=True)
                file.save(str(filepath))
                
                # Find the semantic model root (.SemanticModel or PBIX project with Model)
                if not found_semantic_model:
                    parts = file_path.split('/')
                    for i, part in enumerate(parts):
                        if part.endswith('.SemanticModel'):
                            semantic_model_folder = '/'.join(parts[:i+1])
                            found_semantic_model = True
                            break
                        if part == 'Model' and not semantic_model_folder:
                            # PBIX project layout: use the folder that contains Model
                            semantic_model_folder = '/'.join(parts[:i])
        
        if not semantic_model_folder:
            return jsonify({'success': False, 'error': 'No .SemanticModel or Model folder found in upload'}), 400
        
        pbip_root = str(UPLOAD_FOLDER / semantic_model_folder)
        
        # Verify tables directory exists for either layout
        tables_checks = [
            Path(pbip_root) / 'definition' / 'tables',
            Path(pbip_root) / 'Model' / 'tables',
            Path(pbip_root) / 'tables'
        ]
        if not any(path.exists() for path in tables_checks):
            return jsonify({
                'success': False, 
                'error': 'Invalid PBIP structure. Tables directory not found in definition/tables or Model/tables'
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
        use_python = bool(data.get('usePython'))
        
        if not pbip_path:
            return jsonify({'success': False, 'error': 'No PBIP path provided'}), 400
        
        script_path = Path('scripts') / 'extract-metadata.js'
        args = [pbip_path]
        if use_python:
            args.append('--python')

        result = run_node_script(script_path, args=args, timeout=120)

        if result.returncode != 0:
            return jsonify({'success': False, 'error': result.stderr or result.stdout}), 500

        metadata = json.loads(result.stdout)
        before_metadata = metadata.get('tables', [])

        app_state['before_metadata'] = before_metadata
        app_state['pbip_path'] = pbip_path

        # Persist before metadata for future view-only loads
        pbip_report_path = Path(pbip_path)
        pbip_model_path, report_folder_path = resolve_semantic_model_path(pbip_report_path)
        pbip_folder = report_folder_path.parent if report_folder_path.parent.exists() else report_folder_path
        report_name = normalize_report_name(report_folder_path.name)
        metadata_dir = pbip_folder / '_metadata'

        try:
            metadata_dir.mkdir(parents=True, exist_ok=True)
            metadata_file = metadata_dir / f"{report_name}.json"

            existing_after = []
            if metadata_file.exists():
                try:
                    payload = json.loads(metadata_file.read_text(encoding='utf-8'))
                    existing_after = payload.get('after', [])
                except Exception:
                    existing_after = []

            metadata_payload = {
                'before': before_metadata,
                'after': existing_after
            }
            metadata_file.write_text(json.dumps(metadata_payload, indent=2), encoding='utf-8')
        except Exception as save_err:
            print(f"Warning: Failed to save metadata file: {save_err}")

        return jsonify({
            'success': True,
            'message': 'PBIP converted - BEFORE metadata extracted',
            'before': before_metadata,
            'count': len(before_metadata)
        })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/change-connection', methods=['POST'])
def change_connection():
    """Step 2: Update PBIP connections and extract AFTER metadata"""
    try:
        data = request.get_json()
        pbip_path = data.get('pbipPath') or app_state.get('pbip_path')
        server = data.get('server') or 'dummy_server'
        database = data.get('database') or 'dummy_database'
        target_technology = data.get('targetTechnology', 'Keep Same')
        sql_query = data.get('sqlQuery', '')
        workspace_id = data.get('workspaceId', 'dummy_workspace_id')
        lakehouse_id = data.get('lakehouseId', 'dummy_lakehouse_id')
        use_python = bool(data.get('usePython'))
        
        if not pbip_path:
            return jsonify({'success': False, 'error': 'No PBIP loaded. Click "Convert PBIP" first.'}), 400
        
        pbip_report_path = Path(pbip_path)
        pbip_model_path, report_folder_path = resolve_semantic_model_path(pbip_report_path)

        # Run the transformation pipeline
        params = {
            'pbip_path': str(pbip_model_path),
            'server': server,
            'database': database,
            'workspace_id': workspace_id,
            'lakehouse_id': lakehouse_id,
            'sql_query': sql_query,
            'target_technology': target_technology,
            'use_python': use_python
        }
        
        # Save parameters for scripts
        with open('temp_params.json', 'w') as f:
            json.dump(params, f)
        
        # Run Node.js Phase 3 pipeline
        result = run_node_script(Path('invoke.js'), timeout=180)

        if result.returncode != 0:
            return jsonify({'success': False, 'error': result.stderr or result.stdout}), 500

        response = json.loads(result.stdout)
        after_metadata = response.get('after', [])
        
        # Load the ORIGINAL before metadata from _metadata folder
        pbip_folder = report_folder_path.parent if report_folder_path.parent.exists() else report_folder_path
        metadata_dir = pbip_folder / '_metadata'
        before_metadata = []
        
        # Try to find the report folder and load original before metadata
        report_folder_name = None
        if report_folder_path.is_dir() and report_folder_path.parent.exists():
            report_folder_name = report_folder_path.name
        else:
            for item in pbip_folder.iterdir():
                if item.is_dir() and not item.name.startswith('_'):
                    report_folder_name = item.name
                    break
        
        if report_folder_name and metadata_dir.exists():
            metadata_file = metadata_dir / f"{report_folder_name}.json"
            if metadata_file.exists():
                try:
                    payload = json.loads(metadata_file.read_text(encoding='utf-8'))
                    before_metadata = payload.get('before', [])
                except Exception as e:
                    print(f"Warning: Could not load existing before metadata: {e}")
                    before_metadata = response.get('before', [])  # Fall back to current state
            else:
                # No existing file, check if we got before metadata from invoke.js
                before_metadata = response.get('before', [])
        else:
            before_metadata = response.get('before', [])

        report_name = normalize_report_name(report_folder_name or Path(pbip_path).name)
        if report_name:
            for row in before_metadata:
                row_name = row.get('name') or ''
                row['reportName'] = report_name
                row['reportDisplay'] = report_name
                row['name'] = f"{report_name}::{row_name}" if row_name else report_name
            for row in after_metadata:
                row_name = row.get('name') or ''
                row['reportName'] = report_name
                row['reportDisplay'] = report_name
                row['name'] = f"{report_name}::{row_name}" if row_name else report_name
                normalize_connector_fields(row)
        
        # Save the metadata to _metadata folder (preserving the original before)
        try:
            if report_folder_name:
                metadata_dir.mkdir(parents=True, exist_ok=True)
                metadata_file = metadata_dir / f"{report_folder_name}.json"
                metadata_payload = {
                    'before': before_metadata,
                    'after': after_metadata
                }
                metadata_file.write_text(json.dumps(metadata_payload, indent=2), encoding='utf-8')
        except Exception as save_err:
            print(f"Warning: Failed to save metadata file: {save_err}")

        app_state['before_metadata'] = before_metadata
        app_state['after_metadata'] = after_metadata

        return jsonify({
            'success': True,
            'message': 'Connection updated - metadata extracted',
            'before': before_metadata,
            'after': after_metadata,
            'count': len(after_metadata)
        })
            
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


@app.route('/api/pbi/status', methods=['GET'])
def power_bi_status():
    """Report whether Power BI credentials are configured in server env vars"""
    try:
        tenant_id, client_id, client_secret = get_power_bi_env()
        configured = bool(tenant_id and client_id and client_secret)
        return jsonify({
            'success': True,
            'configured': configured
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/config', methods=['POST'])
def set_power_bi_config():
    """Set Power BI credentials and workspace IDs in memory for the current session"""
    try:
        data = request.get_json()
        tenant_id = data.get('tenantId')
        client_id = data.get('clientId')
        client_secret = data.get('clientSecret')
        source_workspace_id = data.get('sourceWorkspaceId')
        target_workspace_id = data.get('targetWorkspaceId')
        pbix_folder = data.get('pbixFolder')

        if not tenant_id or not client_id or not client_secret:
            return jsonify({'success': False, 'error': 'Tenant ID, Client ID, and Client Secret are required'}), 400

        app_state['pbi_tenant_id'] = tenant_id
        app_state['pbi_client_id'] = client_id
        app_state['pbi_client_secret'] = client_secret
        if source_workspace_id:
            app_state['pbi_source_workspace_id'] = source_workspace_id
        if target_workspace_id:
            app_state['pbi_target_workspace_id'] = target_workspace_id
        if pbix_folder:
            app_state['pbi_pbix_folder'] = pbix_folder

        return jsonify({
            'success': True,
            'message': 'Power BI settings stored for this session'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/download', methods=['POST'])
def download_pbix():
    """Download PBIX files from a Power BI workspace"""
    try:
        data = request.get_json()
        output, error = run_power_bi_action('download', data, timeout=900)
        if error:
            return jsonify({'success': False, 'error': error}), 400

        download_summary = parse_download_summary(output)
        message = 'PBIX download completed'
        if download_summary:
            if download_summary['downloaded'] == 0 and download_summary['total'] > 0:
                message = 'All files are already downloaded.'
            elif download_summary['downloaded'] > 0 and download_summary['skipped'] > 0:
                message = f"Downloaded {download_summary['downloaded']} remaining files; {download_summary['skipped']} already existed."
            elif download_summary['downloaded'] > 0:
                message = f"Downloaded {download_summary['downloaded']} files."

        return jsonify({
            'success': True,
            'message': message,
            'output': output,
            'downloadSummary': download_summary
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/convert', methods=['POST'])
def convert_pbix():
    """Run the convert step (if defined in the script)"""
    try:
        data = request.get_json()
        output, error = run_power_bi_action('convert', data, timeout=600)
        if error:
            return jsonify({'success': False, 'error': error}), 400

        return jsonify({
            'success': True,
            'message': 'Convert step completed',
            'output': output
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/publish', methods=['POST'])
def publish_pbix():
    """Publish PBIX files to the target workspace"""
    try:
        data = request.get_json()
        output, error = run_power_bi_action('publish', data, timeout=1200)
        if error:
            return jsonify({'success': False, 'error': error}), 400

        return jsonify({
            'success': True,
            'message': 'Publish completed',
            'output': output
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/refresh', methods=['POST'])
def refresh_datasets():
    """Refresh datasets in the target workspace"""
    try:
        data = request.get_json()
        output, error = run_power_bi_action('refresh', data, timeout=900)
        if error:
            return jsonify({'success': False, 'error': error}), 400

        return jsonify({
            'success': True,
            'message': 'Refresh completed',
            'output': output
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/list-reports', methods=['GET'])
def list_reports():
    """List available PBIP reports from the PBIP folder"""
    try:
        pbip_folder = request.args.get('pbipFolder') or r"D:\PBIP"
        pbip_path = Path(pbip_folder)
        
        if not pbip_path.exists():
            return jsonify({'success': True, 'reports': []})
        
        reports = []
        for item in pbip_path.iterdir():
            if item.is_dir() and not item.name.startswith('_'):
                report_name = normalize_report_name(item.name)
                if report_name:
                    reports.append({
                        'name': report_name,
                        'displayName': report_name,
                        'folder': item.name
                    })
        
        # Sort reports alphabetically
        reports.sort(key=lambda x: x['name'])
        
        return jsonify({'success': True, 'reports': reports})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/list-pbix', methods=['GET'])
def list_pbix_reports():
    """List available PBIX reports from the PBIX folder"""
    try:
        pbix_folder = request.args.get('pbixFolder') or r"D:\PBIX"
        pbix_path = Path(pbix_folder)

        if not pbix_path.exists():
            return jsonify({'success': True, 'reports': []})

        reports = []
        for item in pbix_path.glob('*.pbix'):
            report_name = normalize_report_name(item.stem)
            if report_name:
                reports.append({
                    'name': report_name,
                    'displayName': report_name,
                    'file': item.name
                })

        reports.sort(key=lambda x: x['name'])

        return jsonify({'success': True, 'reports': reports})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/extract-metadata', methods=['POST'])
def extract_report_metadata():
    """Extract metadata for a specific report"""
    try:
        data = request.get_json()
        report_name = data.get('reportName')
        pbip_folder = data.get('pbipFolder') or r"D:\PBIP"
        
        if not report_name:
            return jsonify({'success': False, 'error': 'Report name is required'}), 400
        
        pbip_path = Path(pbip_folder)
        if not pbip_path.exists():
            return jsonify({'success': False, 'error': f'PBIP folder not found: {pbip_folder}'}), 404
        
        # First check for existing metadata JSON
        metadata_dir = pbip_path / '_metadata'
        
        # Try to find report folder by matching normalized name
        report_folder = None
        for item in pbip_path.iterdir():
            if item.is_dir() and not item.name.startswith('_'):
                if normalize_report_name(item.name).lower() == report_name.lower():
                    report_folder = item
                    break
        
        # Check metadata file first (if report folder found)
        if report_folder:
            metadata_candidates = [
                metadata_dir / f"{report_folder.name}.json",
                report_folder / '_metadata' / f"{report_folder.name}.json"
            ]

            for metadata_file in metadata_candidates:
                if metadata_file.exists():
                    try:
                        payload = json.loads(metadata_file.read_text(encoding='utf-8'))
                        before = payload.get('before', [])
                        after = payload.get('after', [])
                        
                        # Tag rows with report info
                        for row in before:
                            row['reportName'] = report_name
                            row['reportDisplay'] = report_name
                        for row in after:
                            row['reportName'] = report_name
                            row['reportDisplay'] = report_name
                            normalize_connector_fields(row)
                        
                        return jsonify({
                            'success': True,
                            'before': before,
                            'after': after,
                            'source': 'metadata_file'
                        })
                    except Exception as e:
                        print(f"Error reading metadata file: {e}")
        
        # If no metadata file exists, try to extract fresh metadata
        if not report_folder:
            return jsonify({'success': False, 'error': f'Report "{report_name}" not found in {pbip_folder}'}), 404
        
        # Find the semantic model folder within the report folder
        semantic_model_folder = None
        for item in report_folder.iterdir():
            if item.is_dir() and item.name.endswith('.SemanticModel'):
                semantic_model_folder = item
                break
        
        if not semantic_model_folder:
            # Try if the report_folder itself is the semantic model
            if report_folder.name.endswith('.SemanticModel'):
                semantic_model_folder = report_folder
            elif (report_folder / 'Model').is_dir():
                # PBIX project layout: pass the report folder root
                semantic_model_folder = report_folder
            else:
                return jsonify({'success': False, 'error': f'No .SemanticModel or Model folder found in "{report_name}"'}), 404
        
        # Extract metadata using Node.js service
        try:
            invoke_script = Path('scripts/extract-metadata.js')
            if invoke_script.exists():
                result = run_node_script(invoke_script, [str(semantic_model_folder.resolve())])
                if result.returncode == 0 and result.stdout:
                    try:
                        metadata_obj = json.loads(result.stdout)
                        # Extract tables array from metadata object
                        tables = metadata_obj.get('tables', []) if isinstance(metadata_obj, dict) else metadata_obj
                        
                        # Tag with report info
                        for row in tables:
                            row['reportName'] = report_name
                            row['reportDisplay'] = report_name
                            normalize_connector_fields(row)
                        
                        # Save the extracted metadata to _metadata folder
                        try:
                            metadata_dir.mkdir(parents=True, exist_ok=True)
                            metadata_file = metadata_dir / f"{report_folder.name}.json"
                            metadata_payload = {
                                'before': tables,
                                'after': []
                            }
                            metadata_file.write_text(json.dumps(metadata_payload, indent=2), encoding='utf-8')
                        except Exception as save_err:
                            print(f"Warning: Failed to save metadata file: {save_err}")
                        
                        return jsonify({
                            'success': True,
                            'before': tables,
                            'after': [],
                            'source': 'fresh_extraction'
                        })
                    except json.JSONDecodeError as e:
                        return jsonify({'success': False, 'error': f'Failed to parse metadata JSON: {str(e)}'}), 500
            
            # If script doesn't exist or failed, return empty
            return jsonify({
                'success': True,
                'before': [],
                'after': [],
                'source': 'empty',
                'message': 'Metadata extraction script not found or failed'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': f'Metadata extraction failed: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/run-all', methods=['POST'])
def run_full_migration():
    """Run download -> publish -> refresh"""
    try:
        data = request.get_json()
        output, error = run_power_bi_action('all', data, timeout=1800)
        if error:
            return jsonify({'success': False, 'error': error}), 400

        pbip_folder = data.get('pbipFolder') if data else None
        if not pbip_folder:
            pbip_folder = r"D:\PBIP"

        before_metadata, after_metadata = load_run_all_metadata(pbip_folder)

        return jsonify({
            'success': True,
            'message': 'All steps completed',
            'output': output,
            'before': before_metadata,
            'after': after_metadata
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
