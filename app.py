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
import smtplib
import base64
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from werkzeug.utils import secure_filename
import shutil
import zipfile
import tempfile
from datetime import datetime
from email.message import EmailMessage


STATE_FILE = Path('app_state.json')


def _default_app_state():
    return {
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


def load_persisted_app_state():
    if not STATE_FILE.exists():
        return _default_app_state()

    try:
        raw = json.loads(STATE_FILE.read_text(encoding='utf-8'))
        if not isinstance(raw, dict):
            return _default_app_state()

        state = _default_app_state()
        for key in state.keys():
            if key in raw:
                state[key] = raw.get(key)
        return state
    except Exception:
        return _default_app_state()


def persist_app_state():
    try:
        STATE_FILE.write_text(json.dumps(app_state, indent=2), encoding='utf-8')
    except Exception as err:
        print(f"Warning: Failed to persist app state: {err}")


def load_env_file(env_path='.env'):
    """Load simple KEY=VALUE pairs from a .env file into process env.
    Existing non-empty environment variables are not overwritten.
    """
    path = Path(env_path)
    if not path.exists() or not path.is_file():
        return

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()

        if not key:
            continue

        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]

        current = os.environ.get(key)
        if current is None or str(current).strip() == '':
            os.environ[key] = value


load_env_file()

app = Flask(__name__, static_folder='metadata-ui/build')
CORS(app)

# Configuration
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# State storage
app_state = load_persisted_app_state()

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


def load_metadata_cache(pbip_folder):
    metadata_dir = Path(pbip_folder) / '_metadata'
    if not metadata_dir.exists():
        return {}

    cache = {}
    for metadata_file in metadata_dir.glob('*.json'):
        try:
            report_name = normalize_report_name(metadata_file.stem)
            payload = json.loads(metadata_file.read_text(encoding='utf-8'))
            before_rows = payload.get('before', []) or []
            after_rows = payload.get('after', []) or []

            for row in before_rows:
                row['reportName'] = report_name
                row['reportDisplay'] = report_name
                normalize_connector_fields(row)

            for row in after_rows:
                row['reportName'] = report_name
                row['reportDisplay'] = report_name
                normalize_connector_fields(row)

            cache[report_name] = {
                'before': before_rows,
                'after': after_rows
            }
        except Exception:
            continue

    return cache


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

    server, database = extract_connection_details_from_m_query(m_query)
    if server and not row.get('server'):
        row['server'] = server
    if database and not row.get('database'):
        row['database'] = database

    return row


def extract_connection_details_from_m_query(m_query):
    if not m_query:
        return '', ''

    sql_match = re.search(r'Sql\.Database\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"', m_query, re.IGNORECASE)
    if sql_match:
        return sql_match.group(1), sql_match.group(2)

    sql_param_match = re.search(r'Sql\.Database\s*\(\s*([^,\)\r\n]+)\s*,\s*([^,\)\r\n]+)', m_query, re.IGNORECASE)
    if sql_param_match:
        return normalize_sql_arg(sql_param_match.group(1)), normalize_sql_arg(sql_param_match.group(2))

    lakehouse_match = re.search(
        r'WorkspaceId\s*=\s*"([^"]+)"[\s\S]*?LakehouseId\s*=\s*"([^"]+)"',
        m_query,
        re.IGNORECASE
    )
    if lakehouse_match:
        return lakehouse_match.group(1), lakehouse_match.group(2)

    return '', ''


def normalize_sql_arg(value):
    token = str(value or '').strip()
    if not token:
        return ''

    hash_quoted = re.match(r'^#"([^"]+)"$', token)
    if hash_quoted:
        return hash_quoted.group(1).strip()

    quoted = re.match(r'^["\'](.+)["\']$', token)
    if quoted:
        return quoted.group(1).strip()

    return token


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


def env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def send_email_via_graph(recipient_email, subject, attachment_content, attachment_filename):
    graph_tenant_id = os.environ.get('GRAPH_TENANT_ID') or app_state.get('pbi_tenant_id') or os.environ.get('POWERBI_TENANT_ID')
    graph_client_id = os.environ.get('GRAPH_CLIENT_ID') or app_state.get('pbi_client_id') or os.environ.get('POWERBI_CLIENT_ID')
    graph_client_secret = os.environ.get('GRAPH_CLIENT_SECRET') or app_state.get('pbi_client_secret') or os.environ.get('POWERBI_CLIENT_SECRET')
    graph_sender_email = os.environ.get('GRAPH_SENDER_EMAIL') or os.environ.get('SMTP_FROM_EMAIL')
    graph_sender_user_id = os.environ.get('GRAPH_SENDER_USER_ID')

    if not graph_tenant_id:
        raise ValueError('GRAPH_TENANT_ID is required for Graph email mode.')
    if not graph_client_id:
        raise ValueError('GRAPH_CLIENT_ID is required for Graph email mode.')
    if not graph_client_secret:
        raise ValueError('GRAPH_CLIENT_SECRET is required for Graph email mode.')
    if not graph_sender_email and not graph_sender_user_id:
        raise ValueError('Set GRAPH_SENDER_USER_ID or GRAPH_SENDER_EMAIL (or SMTP_FROM_EMAIL) for Graph email mode.')

    token_url = f'https://login.microsoftonline.com/{graph_tenant_id}/oauth2/v2.0/token'
    token_payload = urllib.parse.urlencode({
        'client_id': graph_client_id,
        'client_secret': graph_client_secret,
        'grant_type': 'client_credentials',
        'scope': 'https://graph.microsoft.com/.default'
    }).encode('utf-8')

    token_request = urllib.request.Request(
        token_url,
        data=token_payload,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(token_request, timeout=30) as response:
            token_data = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        error_body = error.read().decode('utf-8', errors='ignore')
        raise ValueError(f'Graph token request failed: {error_body}')

    access_token = token_data.get('access_token')
    if not access_token:
        raise ValueError('Graph token response did not include access_token.')

    attachment_b64 = base64.b64encode(attachment_content.encode('utf-8')).decode('ascii')
    graph_message = {
        'message': {
            'subject': subject,
            'body': {
                'contentType': 'Text',
                'content': 'Please find the migration summary attached.'
            },
            'toRecipients': [
                {
                    'emailAddress': {
                        'address': recipient_email
                    }
                }
            ],
            'attachments': [
                {
                    '@odata.type': '#microsoft.graph.fileAttachment',
                    'name': attachment_filename,
                    'contentType': 'text/plain',
                    'contentBytes': attachment_b64
                }
            ]
        },
        'saveToSentItems': True
    }

    sender_locator = graph_sender_user_id or graph_sender_email
    send_mail_url = f'https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(sender_locator)}/sendMail'
    send_request = urllib.request.Request(
        send_mail_url,
        data=json.dumps(graph_message).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(send_request, timeout=30):
            return
    except urllib.error.HTTPError as error:
        error_body = error.read().decode('utf-8', errors='ignore')
        if 'ErrorInvalidUser' in error_body:
            raise ValueError(
                'Graph sender is invalid for this tenant. Use GRAPH_SENDER_USER_ID (object ID) '
                'or a tenant mailbox UPN in GRAPH_SENDER_EMAIL.'
            )
        raise ValueError(f'Graph sendMail failed: {error_body}')


def send_email_via_webhook(recipient_email, subject, attachment_content, attachment_filename):
    webhook_url = os.environ.get('EMAIL_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('EMAIL_WEBHOOK_URL is required for webhook email mode.')

    payload = {
        'recipientEmail': recipient_email,
        'subject': subject,
        'summaryContent': attachment_content,
        'fileName': attachment_filename
    }

    webhook_request = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(webhook_request, timeout=30):
            return
    except urllib.error.HTTPError as error:
        error_body = error.read().decode('utf-8', errors='ignore')
        raise ValueError(f'Webhook email request failed: {error_body}')


def send_email_smtp(recipient_email, subject, attachment_content, attachment_filename):
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    smtp_from = os.environ.get('SMTP_FROM_EMAIL') or smtp_user
    smtp_use_tls = env_flag('SMTP_USE_TLS', default=True)

    if not smtp_host:
        raise ValueError('SMTP_HOST is not configured. Set SMTP_HOST in environment or .env, then restart backend.')
    if not smtp_from:
        raise ValueError('SMTP_FROM_EMAIL or SMTP_USERNAME is required. Set one of them in environment or .env, then restart backend.')

    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = smtp_from
    message['To'] = recipient_email
    message.set_content('Please find the migration summary attached.')
    message.add_attachment(
        attachment_content.encode('utf-8'),
        maintype='text',
        subtype='plain',
        filename=attachment_filename
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        if smtp_user and smtp_password:
            smtp.login(smtp_user, smtp_password)
        smtp.send_message(message)


def send_email_with_attachment(recipient_email, subject, attachment_content, attachment_filename):
    provider = (os.environ.get('EMAIL_PROVIDER') or 'smtp').strip().lower()

    if provider in {'graph', 'microsoft-graph'}:
        send_email_via_graph(recipient_email, subject, attachment_content, attachment_filename)
        return

    if provider == 'webhook':
        send_email_via_webhook(recipient_email, subject, attachment_content, attachment_filename)
        return

    if provider == 'auto':
        try:
            send_email_smtp(recipient_email, subject, attachment_content, attachment_filename)
            return
        except smtplib.SMTPAuthenticationError as smtp_error:
            error_text = str(smtp_error).lower()
            if 'basic authentication is disabled' in error_text:
                try:
                    send_email_via_graph(recipient_email, subject, attachment_content, attachment_filename)
                    return
                except Exception:
                    send_email_via_webhook(recipient_email, subject, attachment_content, attachment_filename)
                    return
            raise

    send_email_smtp(recipient_email, subject, attachment_content, attachment_filename)


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
        persist_app_state()
        
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
        persist_app_state()

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
                normalize_connector_fields(row)
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
        persist_app_state()

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
        persist_app_state()

        return jsonify({
            'success': True,
            'message': 'Power BI settings stored for this session'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/pbi/config', methods=['GET'])
def get_power_bi_config_state():
    """Get saved Power BI credentials and workspace settings."""
    try:
        return jsonify({
            'success': True,
            'tenantId': app_state.get('pbi_tenant_id') or '',
            'clientId': app_state.get('pbi_client_id') or '',
            'clientSecret': app_state.get('pbi_client_secret') or '',
            'sourceWorkspaceId': app_state.get('pbi_source_workspace_id') or '',
            'targetWorkspaceId': app_state.get('pbi_target_workspace_id') or '',
            'pbixFolder': app_state.get('pbi_pbix_folder') or r'D:\PBIX'
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
                            normalize_connector_fields(row)
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


@app.route('/api/pbi/metadata-cache', methods=['GET'])
def get_metadata_cache():
    """Return all cached report metadata from PBIP _metadata folder."""
    try:
        pbip_folder = request.args.get('pbipFolder') or r"D:\PBIP"
        cache = load_metadata_cache(pbip_folder)
        return jsonify({'success': True, 'metadataCache': cache})
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


@app.route('/api/save-report', methods=['POST'])
def save_report():
    """Save generated report content to the backend working directory."""
    try:
        data = request.get_json(silent=True) or {}
        content = data.get('content', '')
        raw_filename = data.get('filename') or f"report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
        filename = secure_filename(raw_filename)

        if not filename:
            return jsonify({'success': False, 'error': 'Invalid filename'}), 400

        output_path = Path.cwd() / filename
        output_path.write_text(content, encoding='utf-8')

        return jsonify({
            'success': True,
            'filePath': str(output_path),
            'message': 'Report saved successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/send-summary-email', methods=['POST'])
def send_summary_email():
    """Send summary content as an email attachment using SMTP settings from environment variables."""
    try:
        data = request.get_json(silent=True) or {}
        recipient_email = (data.get('recipientEmail') or '').strip()
        summary_content = data.get('summaryContent') or ''
        subject = data.get('subject') or f"Migration Summary - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        file_name = data.get('fileName') or f"migration-summary-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"

        if not recipient_email:
            return jsonify({'success': False, 'error': 'recipientEmail is required'}), 400
        if not summary_content:
            return jsonify({'success': False, 'error': 'summaryContent is required'}), 400

        send_email_with_attachment(recipient_email, subject, summary_content, file_name)

        return jsonify({
            'success': True,
            'message': f'Summary email sent to {recipient_email}'
        })
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to send email: {str(e)}'}), 500


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
