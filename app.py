from flask import Flask, render_template, request, jsonify, session
import markdown
import xml.dom.minidom
from datetime import datetime, timezone
import time
import difflib
import os
import requests
import json as json_module
import zipfile
import io
import re
from concurrent.futures import ThreadPoolExecutor
import threading
import hashlib

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
app.config['DATABASE'] = os.path.join(app.instance_path, 'mytools.db')
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max upload

# Ensure instance folder exists
os.makedirs(app.instance_path, exist_ok=True)

# Create cache directory for parsed logs
CACHE_DIR = os.path.join(app.instance_path, 'log_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# Global cache for parsed logs (in-memory)
parsed_logs_cache = {}
cache_lock = threading.Lock()

@app.route('/')
def index():
    """Main page showing all available tools"""
    return render_template('index.html')

@app.route('/tools/markdown-converter')
def markdown_converter():
    """Markdown to HTML converter tool"""
    return render_template('tools/markdown_converter.html')

@app.route('/tools/xml-formatter')
def xml_formatter():
    """XML formatter tool"""
    return render_template('tools/xml_formatter.html')

@app.route('/tools/epoch-converter')
def epoch_converter():
    """EPOCH to DateTime converter tool"""
    return render_template('tools/epoch_converter.html')

@app.route('/tools/file-compare')
def file_compare():
    """File/Text comparison tool"""
    return render_template('tools/file_compare.html')

@app.route('/tools/string-processor')
def string_processor():
    """String processing and transformation tool"""
    return render_template('tools/string_processor.html')

@app.route('/tools/sql-formatter')
def sql_formatter():
    """SQL query formatter tool"""
    return render_template('tools/sql_formatter.html')

@app.route('/tools/c-formatter')
def c_formatter():
    """C code formatter tool"""
    return render_template('tools/c_formatter.html')

@app.route('/tools/c-flowchart')
def c_flowchart():
    """C function flowchart generator"""
    return render_template('tools/c_flowchart.html')

@app.route('/tools/c-loop-analyzer')
def c_loop_analyzer():
    """C loop analyzer tool"""
    return render_template('tools/c_loop_analyzer.html')

@app.route('/tools/api-tester')
def api_tester():
    """API testing tool (like Postman)"""
    return render_template('tools/api_tester.html')

@app.route('/tools/base64-converter')
def base64_converter():
    """Base64 encoding/decoding tool"""
    return render_template('tools/base64_converter.html')

@app.route('/tools/json-formatter')
def json_formatter():
    """JSON formatter and validator tool"""
    return render_template('tools/json_formatter.html')

@app.route('/tools/c-memory-leak-finder')
def c_memory_leak_finder():
    """C code memory leak detection tool"""
    return render_template('tools/c_memory_leak_finder.html')

@app.route('/tools/c-code-viewer')
def c_code_viewer():
    """C code viewer and navigator tool"""
    return render_template('tools/c_code_viewer.html')

@app.route('/tools/java-code-viewer')
def java_code_viewer():
    """Java code viewer and navigator tool"""
    return render_template('tools/java_code_viewer.html')

@app.route('/tools/brm-cm-logviewer')
def brm_cm_logviewer():
    """BRM CM log viewer and analyzer tool"""
    return render_template('tools/brm_cm_logviewer.html')

@app.route('/tools/podl-editor')
def podl_editor():
    """PODL class definition editor tool"""
    return render_template('tools/podl_editor.html')

@app.route('/tools/plsql-sql-converter')
def plsql_sql_converter():
    """PL/SQL Dynamic SQL to Regular SQL Converter"""
    return render_template('tools/plsql_sql_converter.html')

@app.route('/api/parse-brm-logs', methods=['POST'])
def parse_brm_logs():
    """API endpoint to parse BRM CM logs from ZIP file - Returns summary only"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.zip'):
            return jsonify({'success': False, 'error': 'Only ZIP files are supported'}), 400
        
        # Generate cache key from file
        file_content = file.read()
        file_hash = hashlib.md5(file_content).hexdigest()
        
        # Check if already parsed
        with cache_lock:
            if file_hash in parsed_logs_cache:
                print(f"Using cached data for {file.filename}")
                return jsonify({
                    'success': True,
                    'cacheKey': file_hash,
                    'summary': parsed_logs_cache[file_hash]['summary']
                })
        
        print(f"Parsing {file.filename} ({len(file_content) / (1024*1024):.2f} MB)...")
        
        # Parse the ZIP file with threading
        all_logs = []
        process_stats = {}
        
        with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zip_ref:
            file_list = [f for f in zip_ref.namelist() 
                        if not f.startswith('__MACOSX') 
                        and not f.startswith('.') 
                        and not f.endswith('/')]
            
            if not file_list:
                return jsonify({'success': False, 'error': 'No valid files found in ZIP'}), 400
            
            print(f"Found {len(file_list)} files in ZIP")
            
            # Use ThreadPoolExecutor for parallel processing
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = []
                for filename in file_list:
                    future = executor.submit(parse_single_file_from_zip, zip_ref, filename)
                    futures.append(future)
                
                # Collect results
                for future in futures:
                    try:
                        logs = future.result()
                        all_logs.extend(logs)
                    except Exception as e:
                        print(f"Error in thread: {e}")
                        continue
        
        print(f"Total logs parsed: {len(all_logs)}")
        
        # Build summary (don't send all logs)
        summary = build_log_summary(all_logs)
        
        # Store raw file content for line-by-line viewing
        raw_file_content = {}
        with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zip_ref:
            for filename in file_list:
                try:
                    with zip_ref.open(filename) as log_file:
                        content = log_file.read().decode('utf-8', errors='ignore')
                        raw_file_content[filename] = content
                except Exception as e:
                    print(f"Error reading raw content from {filename}: {str(e)}")
        
        # Cache the full logs and raw content
        with cache_lock:
            parsed_logs_cache[file_hash] = {
                'logs': all_logs,
                'summary': summary,
                'raw_files': raw_file_content
            }
        
        return jsonify({
            'success': True,
            'cacheKey': file_hash,
            'summary': summary
        })
    
    except Exception as e:
        print(f"Error parsing BRM logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-process-logs/<cache_key>/<process_name>', methods=['GET'])
def get_process_logs(cache_key, process_name):
    """Get logs for a specific process (paginated)"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 100))
        level_filter = request.args.get('level', '')
        search_query = request.args.get('search', '')
        
        with cache_lock:
            if cache_key not in parsed_logs_cache:
                return jsonify({'success': False, 'error': 'Cache expired. Please re-upload file.'}), 404
            
            all_logs = parsed_logs_cache[cache_key]['logs']
        
        # Filter by process
        process_logs = [log for log in all_logs if log['process'] == process_name]
        
        # Apply level filter
        if level_filter:
            process_logs = [log for log in process_logs if log['level'] == level_filter]
        
        # Apply search filter
        if search_query:
            search_lower = search_query.lower()
            process_logs = [log for log in process_logs 
                          if search_lower in log.get('message', '').lower() 
                          or search_lower in log.get('flistContent', '').lower()
                          or search_lower in log.get('sourceFile', '').lower()]
        
        # Pagination
        total = len(process_logs)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_logs = process_logs[start:end]
        
        return jsonify({
            'success': True,
            'logs': paginated_logs,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        })
    
    except Exception as e:
        print(f"Error getting process logs: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-unique-errors/<cache_key>/<process_name>', methods=['GET'])
def get_unique_errors(cache_key, process_name):
    """Get unique errors for a process"""
    try:
        from_line = int(request.args.get('from_line', 0))
        to_line = int(request.args.get('to_line', 999999999))
        
        with cache_lock:
            if cache_key not in parsed_logs_cache:
                return jsonify({'success': False, 'error': 'Cache expired'}), 404
            
            all_logs = parsed_logs_cache[cache_key]['logs']
        
        # Filter by process and error level
        error_logs = [log for log in all_logs 
                     if log['process'] == process_name 
                     and log['level'] == 'E'
                     and from_line <= log.get('lineNumber', 0) <= to_line]
        
        # Group unique errors
        unique_errors = {}
        for log in error_logs:
            key = f"{log.get('message', '')}|{log.get('sourceFile', '')}"
            if key not in unique_errors:
                unique_errors[key] = {
                    'message': log.get('message', ''),
                    'sourceFile': log.get('sourceFile', ''),
                    'count': 0,
                    'firstLine': log.get('lineNumber', 0)
                }
            unique_errors[key]['count'] += 1
        
        return jsonify({
            'success': True,
            'errors': list(unique_errors.values())
        })
    
    except Exception as e:
        print(f"Error getting unique errors: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-complete-logs/<cache_key>', methods=['GET'])
def get_complete_logs(cache_key):
    """Get complete raw file content by actual file line numbers"""
    try:
        from_line = int(request.args.get('from_line', 1))
        to_line = int(request.args.get('to_line', 100))
        file_name = request.args.get('file_name', '')  # Optional: specific file
        
        # Limit to 5000 lines max for raw view
        if to_line - from_line > 5000:
            return jsonify({'success': False, 'error': 'Maximum 5000 lines allowed at once'}), 400
        
        with cache_lock:
            if cache_key not in parsed_logs_cache:
                return jsonify({'success': False, 'error': 'Cache expired. Please re-upload file.'}), 404
            
            raw_files = parsed_logs_cache[cache_key].get('raw_files', {})
        
        if not raw_files:
            return jsonify({'success': False, 'error': 'No raw file content available'}), 404
        
        # If specific file requested, use it; otherwise combine all files
        if file_name and file_name in raw_files:
            content = raw_files[file_name]
        else:
            # Combine all files
            content = '\n'.join([f'=== File: {fname} ===\n{fcontent}' 
                                for fname, fcontent in raw_files.items()])
        
        # Split into actual lines
        all_lines = content.split('\n')
        
        # Get the requested line range (1-indexed)
        from_idx = max(0, from_line - 1)
        to_idx = min(len(all_lines), to_line)
        
        selected_lines = all_lines[from_idx:to_idx]
        
        # Format with actual line numbers
        formatted_lines = []
        for i, line in enumerate(selected_lines, start=from_line):
            formatted_lines.append(f"{i:6d} | {line}")
        
        return jsonify({
            'success': True,
            'rawText': '\n'.join(formatted_lines),
            'totalLines': len(all_lines),
            'displayedLines': len(selected_lines),
            'from_line': from_line,
            'to_line': min(to_line, len(all_lines))
        })
    
    except Exception as e:
        print(f"Error getting complete logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-file-list/<cache_key>', methods=['GET'])
def get_file_list(cache_key):
    """Get list of files in the parsed log"""
    try:
        with cache_lock:
            if cache_key not in parsed_logs_cache:
                return jsonify({'success': False, 'error': 'Cache expired'}), 404
            
            raw_files = parsed_logs_cache[cache_key].get('raw_files', {})
        
        files = []
        for fname, content in raw_files.items():
            line_count = len(content.split('\n'))
            files.append({
                'name': fname,
                'lines': line_count
            })
        
        return jsonify({
            'success': True,
            'files': files
        })
    
    except Exception as e:
        print(f"Error getting file list: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-full-cm-logs/<cache_key>/<process_name>', methods=['GET'])
def get_full_cm_logs(cache_key, process_name):
    """Get all logs for a specific CM process in raw format"""
    try:
        with cache_lock:
            if cache_key not in parsed_logs_cache:
                return jsonify({'success': False, 'error': 'Cache expired'}), 404
            
            all_logs = parsed_logs_cache[cache_key]['logs']
        
        # Filter by process
        process_logs = [log for log in all_logs if log['process'] == process_name]
        
        if not process_logs:
            return jsonify({'success': False, 'error': 'No logs found for this CM process'}), 404
        
        # Build raw text from all logs for this CM (original format)
        raw_lines = []
        for log in process_logs:
            # Add the original raw log header
            raw_lines.append(log.get('rawContent', ''))
            # Add message if present
            if log.get('message'):
                raw_lines.append(f"    {log.get('message')}")
            # Add flist content if present
            if log.get('flistContent'):
                raw_lines.append(log.get('flistContent'))
            raw_lines.append('')  # Empty line between entries
        
        raw_text = '\n'.join(raw_lines)
        
        return jsonify({
            'success': True,
            'rawText': raw_text,
            'totalLogs': len(process_logs),
            'processName': process_name
        })
    
    except Exception as e:
        print(f"Error getting full CM logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/download-all-cm-logs/<cache_key>', methods=['GET'])
def download_all_cm_logs(cache_key):
    """Download all CM logs as separate files in a ZIP"""
    try:
        from flask import send_file
        
        with cache_lock:
            if cache_key not in parsed_logs_cache:
                return jsonify({'success': False, 'error': 'Cache expired'}), 404
            
            all_logs = parsed_logs_cache[cache_key]['logs']
        
        # Group logs by process
        process_logs_map = {}
        for log in all_logs:
            process_key = log['process']
            if process_key not in process_logs_map:
                process_logs_map[process_key] = {
                    'processName': log['processName'],
                    'processPid': log['processPid'],
                    'logs': []
                }
            process_logs_map[process_key]['logs'].append(log)
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for process_key, data in process_logs_map.items():
                # Build content for this CM process (original format)
                raw_lines = []
                for log in data['logs']:
                    # Use original log header without added line numbers
                    raw_lines.append(log.get('rawContent', ''))
                    if log.get('message'):
                        raw_lines.append(f"    {log.get('message')}")
                    if log.get('flistContent'):
                        raw_lines.append(log.get('flistContent'))
                    raw_lines.append('')
                
                content = '\n'.join(raw_lines)
                
                # Add file to ZIP
                filename = f"{data['processName']}_{data['processPid']}.log"
                zip_file.writestr(filename, content)
        
        zip_buffer.seek(0)
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'brm_cm_logs_{int(time.time())}.zip'
        )
    
    except Exception as e:
        print(f"Error creating ZIP: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def parse_single_file_from_zip(zip_ref, filename):
    """Parse a single log file from ZIP"""
    try:
        with zip_ref.open(filename) as log_file:
            content = log_file.read().decode('utf-8', errors='ignore')
            return parse_brm_log_content(content, filename)
    except Exception as e:
        print(f"Error processing {filename}: {str(e)}")
        return []

def build_log_summary(all_logs):
    """Build summary statistics without sending all logs"""
    # Add line numbers
    for idx, log in enumerate(all_logs):
        log['lineNumber'] = idx + 1
    
    # Group by process
    processes = {}
    for log in all_logs:
        process_key = log['process']
        if process_key not in processes:
            processes[process_key] = {
                'process': log['process'],
                'processName': log['processName'],
                'processPid': log['processPid'],
                'errors': 0,
                'warnings': 0,
                'debugs': 0,
                'total': 0
            }
        
        processes[process_key]['total'] += 1
        if log['level'] == 'E':
            processes[process_key]['errors'] += 1
        elif log['level'] == 'W':
            processes[process_key]['warnings'] += 1
        elif log['level'] == 'D':
            processes[process_key]['debugs'] += 1
    
    # Overall stats
    total_errors = sum(1 for log in all_logs if log['level'] == 'E')
    total_warnings = sum(1 for log in all_logs if log['level'] == 'W')
    total_debugs = sum(1 for log in all_logs if log['level'] == 'D')
    
    return {
        'totalLogs': len(all_logs),
        'totalProcesses': len(processes),
        'totalErrors': total_errors,
        'totalWarnings': total_warnings,
        'totalDebugs': total_debugs,
        'processes': list(processes.values())
    }

def parse_brm_log_content(content, filename):
    """Parse BRM CM log content"""
    logs = []
    lines = content.split('\n')
    i = 0
    
    # Pattern: <Level> <Timestamp> <hostname> <process:pid> <file:line> <thread_info>
    log_header_regex = re.compile(
        r'^([DEW])\s+'  # Level
        r'(\w{3}\s+\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+'  # Timestamp
        r'(\S+)\s+'  # Hostname
        r'([\w_]+:\d+)\s+'  # Process:PID
        r'([\w_.]+:\d+)\s+'  # File:Line
        r'(.+)$'  # Thread info
    )
    
    while i < len(lines):
        line = lines[i]
        match = log_header_regex.match(line)
        
        if match:
            level = match.group(1)
            timestamp = match.group(2)
            hostname = match.group(3)
            process = match.group(4)
            source_file = match.group(5)
            thread_info = match.group(6)
            
            # Get message (next line, typically indented)
            i += 1
            message = ''
            if i < len(lines) and lines[i].strip():
                message = lines[i].strip()
                i += 1
            
            # Get flist content (until next log entry)
            flist_lines = []
            while i < len(lines):
                next_line = lines[i]
                if log_header_regex.match(next_line):
                    break
                flist_lines.append(next_line)
                i += 1
            
            process_parts = process.split(':')
            logs.append({
                'level': level,
                'timestamp': timestamp,
                'hostname': hostname,
                'process': process,
                'processName': process_parts[0] if process_parts else '',
                'processPid': process_parts[1] if len(process_parts) > 1 else '',
                'sourceFile': source_file,
                'threadInfo': thread_info,
                'message': message,
                'flistContent': '\n'.join(flist_lines),
                'fileName': filename,
                'rawContent': line
            })
        else:
            i += 1
    
    return logs

@app.route('/api/convert-markdown', methods=['POST'])
def convert_markdown():
    """API endpoint to convert markdown to HTML"""
    data = request.get_json()
    markdown_text = data.get('markdown', '')
    
    # Convert markdown to HTML with extensions
    html = markdown.markdown(
        markdown_text,
        extensions=[
            'extra',
            'codehilite',
            'tables',
            'fenced_code',
            'nl2br'
        ]
    )
    
    return jsonify({
        'success': True,
        'html': html
    })

@app.route('/api/format-xml', methods=['POST'])
def format_xml():
    """API endpoint to format XML"""
    data = request.get_json()
    xml_text = data.get('xml', '')
    indent = data.get('indent', 2)
    generate_tree = data.get('generate_tree', False)
    
    try:
        # Parse and format the XML
        dom = xml.dom.minidom.parseString(xml_text)
        formatted_xml = dom.toprettyxml(indent=' ' * indent)
        
        # Remove extra blank lines
        lines = [line for line in formatted_xml.split('\n') if line.strip()]
        formatted_xml = '\n'.join(lines)
        
        response = {
            'success': True,
            'formatted': formatted_xml,
            'message': 'XML formatted successfully'
        }
        
        # Generate tree structure if requested
        if generate_tree:
            tree_structure = xml_to_tree(dom.documentElement)
            response['tree'] = tree_structure
        
        return jsonify(response)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Invalid XML format'
        }), 400

def xml_to_tree(element, level=0):
    """Convert XML element to tree structure"""
    node = {
        'name': element.nodeName,
        'type': 'element',
        'level': level,
        'attributes': {},
        'text': '',
        'children': []
    }
    
    # Get attributes
    if element.hasAttributes():
        for i in range(element.attributes.length):
            attr = element.attributes.item(i)
            node['attributes'][attr.name] = attr.value
    
    # Get text content (only direct text, not from children)
    text_content = ''
    for child in element.childNodes:
        if child.nodeType == child.TEXT_NODE:
            text = child.nodeValue.strip()
            if text:
                text_content += text
    node['text'] = text_content
    
    # Get child elements
    for child in element.childNodes:
        if child.nodeType == child.ELEMENT_NODE:
            node['children'].append(xml_to_tree(child, level + 1))
    
    return node

@app.route('/api/epoch-to-datetime', methods=['POST'])
def epoch_to_datetime():
    """API endpoint to convert EPOCH to DateTime"""
    data = request.get_json()
    epoch_value = data.get('epoch', '')
    
    try:
        # Handle different epoch formats (seconds, milliseconds)
        epoch_float = float(epoch_value)
        
        # Determine if it's in seconds or milliseconds
        if epoch_float > 10000000000:  # Likely milliseconds
            epoch_seconds = epoch_float / 1000
            timestamp_type = 'milliseconds'
        else:
            epoch_seconds = epoch_float
            timestamp_type = 'seconds'
        
        # Convert to datetime
        dt_utc = datetime.fromtimestamp(epoch_seconds, tz=timezone.utc)
        dt_local = datetime.fromtimestamp(epoch_seconds)
        
        return jsonify({
            'success': True,
            'timestamp_type': timestamp_type,
            'utc': {
                'iso': dt_utc.isoformat(),
                'readable': dt_utc.strftime('%Y-%m-%d %H:%M:%S UTC'),
                'full': dt_utc.strftime('%A, %B %d, %Y %H:%M:%S UTC'),
            },
            'local': {
                'iso': dt_local.isoformat(),
                'readable': dt_local.strftime('%Y-%m-%d %H:%M:%S'),
                'full': dt_local.strftime('%A, %B %d, %Y %H:%M:%S'),
                'timezone': time.strftime('%Z')
            }
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': 'Invalid EPOCH timestamp',
            'message': 'Please enter a valid numeric EPOCH timestamp'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error converting EPOCH timestamp'
        }), 400

@app.route('/api/datetime-to-epoch', methods=['POST'])
def datetime_to_epoch():
    """API endpoint to convert DateTime to EPOCH"""
    data = request.get_json()
    datetime_str = data.get('datetime', '')
    
    try:
        # Try to parse the datetime string
        # Support multiple formats
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
            '%Y/%m/%d %H:%M:%S',
            '%Y/%m/%d %H:%M',
            '%Y/%m/%d',
            '%d-%m-%Y %H:%M:%S',
            '%d-%m-%Y %H:%M',
            '%d-%m-%Y',
            '%d/%m/%Y %H:%M:%S',
            '%d/%m/%Y %H:%M',
            '%d/%m/%Y',
        ]
        
        dt = None
        for fmt in formats:
            try:
                dt = datetime.strptime(datetime_str, fmt)
                break
            except ValueError:
                continue
        
        if dt is None:
            return jsonify({
                'success': False,
                'error': 'Invalid datetime format',
                'message': 'Please use format: YYYY-MM-DD HH:MM:SS or similar'
            }), 400
        
        # Convert to EPOCH
        epoch_seconds = int(dt.timestamp())
        epoch_milliseconds = int(dt.timestamp() * 1000)
        
        return jsonify({
            'success': True,
            'epoch_seconds': epoch_seconds,
            'epoch_milliseconds': epoch_milliseconds,
            'parsed_datetime': dt.strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error converting DateTime to EPOCH'
        }), 400

@app.route('/api/current-timestamp', methods=['GET'])
def current_timestamp():
    """API endpoint to get current timestamp"""
    now = datetime.now()
    now_utc = datetime.now(timezone.utc)
    
    return jsonify({
        'success': True,
        'epoch_seconds': int(time.time()),
        'epoch_milliseconds': int(time.time() * 1000),
        'utc': {
            'iso': now_utc.isoformat(),
            'readable': now_utc.strftime('%Y-%m-%d %H:%M:%S UTC'),
        },
        'local': {
            'iso': now.isoformat(),
            'readable': now.strftime('%Y-%m-%d %H:%M:%S'),
            'timezone': time.strftime('%Z')
        }
    })

@app.route('/api/compare-text', methods=['POST'])
def compare_text():
    """API endpoint to compare two text blocks"""
    data = request.get_json()
    text1 = data.get('text1', '')
    text2 = data.get('text2', '')
    comparison_type = data.get('type', 'unified')  # unified or side-by-side
    
    try:
        # Split into lines
        lines1 = text1.splitlines(keepends=True)
        lines2 = text2.splitlines(keepends=True)
        
        # Get diff
        if comparison_type == 'unified':
            # Unified diff format
            diff = list(difflib.unified_diff(
                lines1, 
                lines2, 
                fromfile='Original', 
                tofile='Modified',
                lineterm=''
            ))
            
            return jsonify({
                'success': True,
                'type': 'unified',
                'diff': diff,
                'stats': get_diff_stats(lines1, lines2)
            })
        else:
            # Side-by-side diff with detailed changes
            diff_result = []
            
            # Use SequenceMatcher for detailed comparison
            matcher = difflib.SequenceMatcher(None, lines1, lines2)
            
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == 'equal':
                    for i in range(i1, i2):
                        diff_result.append({
                            'type': 'equal',
                            'left_line': i + 1,
                            'right_line': j1 + (i - i1) + 1,
                            'left_content': lines1[i].rstrip('\n\r'),
                            'right_content': lines2[j1 + (i - i1)].rstrip('\n\r') if j1 + (i - i1) < len(lines2) else ''
                        })
                elif tag == 'delete':
                    for i in range(i1, i2):
                        diff_result.append({
                            'type': 'delete',
                            'left_line': i + 1,
                            'right_line': None,
                            'left_content': lines1[i].rstrip('\n\r'),
                            'right_content': ''
                        })
                elif tag == 'insert':
                    for j in range(j1, j2):
                        diff_result.append({
                            'type': 'insert',
                            'left_line': None,
                            'right_line': j + 1,
                            'left_content': '',
                            'right_content': lines2[j].rstrip('\n\r')
                        })
                elif tag == 'replace':
                    # Handle replacements
                    max_lines = max(i2 - i1, j2 - j1)
                    for k in range(max_lines):
                        left_idx = i1 + k
                        right_idx = j1 + k
                        
                        diff_result.append({
                            'type': 'replace',
                            'left_line': left_idx + 1 if left_idx < i2 else None,
                            'right_line': right_idx + 1 if right_idx < j2 else None,
                            'left_content': lines1[left_idx].rstrip('\n\r') if left_idx < i2 else '',
                            'right_content': lines2[right_idx].rstrip('\n\r') if right_idx < j2 else ''
                        })
            
            return jsonify({
                'success': True,
                'type': 'side-by-side',
                'diff': diff_result,
                'stats': get_diff_stats(lines1, lines2)
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error comparing text'
        }), 400

def get_diff_stats(lines1, lines2):
    """Calculate statistics about the diff"""
    matcher = difflib.SequenceMatcher(None, lines1, lines2)
    
    added = 0
    deleted = 0
    modified = 0
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'insert':
            added += (j2 - j1)
        elif tag == 'delete':
            deleted += (i2 - i1)
        elif tag == 'replace':
            modified += max(i2 - i1, j2 - j1)
    
    similarity = matcher.ratio() * 100
    
    return {
        'total_lines_left': len(lines1),
        'total_lines_right': len(lines2),
        'lines_added': added,
        'lines_deleted': deleted,
        'lines_modified': modified,
        'similarity_percent': round(similarity, 2)
    }

@app.route('/api/send-request', methods=['POST'])
def send_request():
    """API endpoint to proxy HTTP requests"""
    data = request.get_json()
    
    method = data.get('method', 'GET').upper()
    url = data.get('url', '')
    headers = data.get('headers', {})
    body = data.get('body', '')
    body_type = data.get('bodyType', 'none')
    timeout = data.get('timeout', 30)
    
    try:
        start_time = time.time()
        
        # Prepare request arguments
        request_args = {
            'url': url,
            'headers': headers,
            'timeout': timeout,
            'allow_redirects': True
        }
        
        # Add body if applicable
        if method in ['POST', 'PUT', 'PATCH'] and body_type != 'none':
            if body_type == 'json':
                try:
                    request_args['json'] = json_module.loads(body)
                except json_module.JSONDecodeError:
                    request_args['data'] = body
            elif body_type == 'form':
                # Parse form data
                form_data = {}
                for line in body.split('\n'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        form_data[key.strip()] = value.strip()
                request_args['data'] = form_data
            else:  # raw
                request_args['data'] = body
        
        # Send request
        if method == 'GET':
            response = requests.get(**request_args)
        elif method == 'POST':
            response = requests.post(**request_args)
        elif method == 'PUT':
            response = requests.put(**request_args)
        elif method == 'PATCH':
            response = requests.patch(**request_args)
        elif method == 'DELETE':
            response = requests.delete(**request_args)
        elif method == 'HEAD':
            response = requests.head(**request_args)
        elif method == 'OPTIONS':
            response = requests.options(**request_args)
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported HTTP method: {method}'
            }), 400
        
        end_time = time.time()
        duration = round((end_time - start_time) * 1000)  # milliseconds
        
        # Try to parse response as JSON
        try:
            response_body = response.json()
            content_type = 'json'
        except:
            response_body = response.text
            content_type = 'text'
        
        # Get response headers
        response_headers = dict(response.headers)
        
        return jsonify({
            'success': True,
            'status': response.status_code,
            'statusText': response.reason,
            'headers': response_headers,
            'body': response_body,
            'contentType': content_type,
            'duration': duration,
            'size': len(response.content)
        })
        
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Request timeout',
            'message': f'Request took longer than {timeout} seconds'
        }), 408
    except requests.exceptions.ConnectionError as e:
        return jsonify({
            'success': False,
            'error': 'Connection error',
            'message': str(e)
        }), 503
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': 'Request failed',
            'message': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=4000)

