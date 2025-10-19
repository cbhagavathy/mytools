// BRM CM LogViewer JavaScript - Optimized for large files

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const parseBtn = document.getElementById('parseBtn');
    const parseSpinner = document.getElementById('parseSpinner');
    const processSection = document.getElementById('processSection');
    const processList = document.getElementById('processList');
    const statsBar = document.getElementById('statsBar');
    const controlsSection = document.getElementById('controlsSection');
    const logsSection = document.getElementById('logsSection');
    const logDisplay = document.getElementById('logDisplay');
    const searchInput = document.getElementById('searchInput');
    const levelFilter = document.getElementById('levelFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const showErrorsBtn = document.getElementById('showErrorsBtn');
    const errorSummary = document.getElementById('errorSummary');
    const errorList = document.getElementById('errorList');
    const completeLogSection = document.getElementById('completeLogSection');
    const completeLogFromLine = document.getElementById('completeLogFromLine');
    const completeLogToLine = document.getElementById('completeLogToLine');
    const loadCompleteLogBtn = document.getElementById('loadCompleteLogBtn');
    const completeLogDisplay = document.getElementById('completeLogDisplay');
    const fileSelector = document.getElementById('fileSelector');
    const viewFullFileBtn = document.getElementById('viewFullFileBtn');
    const completeLogStats = document.getElementById('completeLogStats');
    const statsText = document.getElementById('statsText');
    const setLastLineBtn = document.getElementById('setLastLineBtn');
    const viewFullCMBtn = document.getElementById('viewFullCMBtn');
    const cmSelector = document.getElementById('cmSelector');
    const paginationControls = document.getElementById('paginationControls');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    const selectedFileInfo = document.getElementById('selectedFileInfo');
    const downloadAllCMBtn = document.getElementById('downloadAllCMBtn');

    // State
    let currentFile = null;
    let cacheKey = null;
    let currentProcess = null;
    let currentPage = 1;
    let totalPages = 1;
    let summary = null;
    let currentFileTotalLines = 0;
    let currentViewPage = 1;
    let currentViewTotalPages = 1;
    let currentViewContent = [];

    // File Upload Handlers
    fileUploadArea.addEventListener('click', () => fileInput.click());
    
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    clearFileBtn.addEventListener('click', () => {
        currentFile = null;
        cacheKey = null;
        fileInput.value = '';
        fileInfo.classList.remove('show');
        processSection.classList.remove('show');
        controlsSection.classList.remove('show');
        logsSection.classList.remove('show');
        errorSummary.style.display = 'none';
    });

    parseBtn.addEventListener('click', parseLogFile);

    // Handle file selection
    function handleFile(file) {
        if (!file.name.endsWith('.zip')) {
            alert('Please select a ZIP file only');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = `(${formatFileSize(file.size)})`;
        fileInfo.classList.add('show');
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    // Parse Log File
    async function parseLogFile() {
        if (!currentFile) return;

        parseSpinner.classList.add('show');
        
        try {
            const formData = new FormData();
            formData.append('file', currentFile);
            
            console.log(`Uploading ${currentFile.name} to server for parsing...`);
            
            const response = await fetch('/api/parse-brm-logs', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to parse logs');
            }
            
            cacheKey = result.cacheKey;
            summary = result.summary;
            
            console.log(`Successfully parsed ${summary.totalLogs} log entries`);
            console.log(`Found ${summary.totalProcesses} CM processes`);

            parseSpinner.classList.remove('show');
            
            if (summary.totalLogs === 0) {
                alert('No BRM CM log entries found. Please ensure the log files follow the BRM CM log format.');
                return;
            }
            
            displayProcesses();
            
            // Show complete log view section and load file list
            completeLogSection.style.display = 'block';
            loadFileList();
            
        } catch (error) {
            console.error('Error parsing log file:', error);
            alert('Error parsing log file: ' + error.message);
            parseSpinner.classList.remove('show');
        }
    }

    // Display CM Processes
    function displayProcesses() {
        // Display stats
        statsBar.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${summary.totalLogs}</div>
                <div class="stat-label">Total Logs</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${summary.totalProcesses}</div>
                <div class="stat-label">CM Processes</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${summary.totalErrors}</div>
                <div class="stat-label">Errors</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${summary.totalWarnings}</div>
                <div class="stat-label">Warnings</div>
            </div>
        `;

        // Display process cards
        processList.innerHTML = '';
        
        // Populate CM selector dropdown
        cmSelector.innerHTML = '<option value="">Select a CM Process...</option>';
        cmSelector.disabled = false;
        
        summary.processes.forEach(processData => {
            // Add to process cards
            const card = document.createElement('div');
            card.className = 'process-card';
            card.innerHTML = `
                <div class="process-name">${processData.processName}</div>
                <div class="process-stats">
                    PID: ${processData.processPid}<br>
                    <span class="badge badge-error">E: ${processData.errors}</span>
                    <span class="badge badge-warning">W: ${processData.warnings}</span>
                    <span class="badge badge-debug">D: ${processData.debugs}</span>
                </div>
                <button class="process-download-btn" data-process="${processData.process}">
                    <i class="fas fa-download"></i> Download
                </button>
            `;
            
            // Click handler for the card (but not the download button)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.process-download-btn')) {
                    selectProcess(processData.process, card);
                }
            });
            
            // Download button handler
            const downloadBtn = card.querySelector('.process-download-btn');
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadCMLog(processData.process, processData.processName, processData.processPid);
            });
            
            processList.appendChild(card);
            
            // Add to CM selector dropdown
            const option = document.createElement('option');
            option.value = processData.process;
            option.textContent = `${processData.processName}:${processData.processPid} (E:${processData.errors} W:${processData.warnings} D:${processData.debugs})`;
            cmSelector.appendChild(option);
        });

        // Show Download All button
        downloadAllCMBtn.style.display = 'block';
        
        processSection.classList.add('show');
    }

    // Select a process and load logs
    async function selectProcess(processKey, cardElement) {
        document.querySelectorAll('.process-card').forEach(c => c.classList.remove('active'));
        cardElement.classList.add('active');

        currentProcess = processKey;
        currentPage = 1;
        
        // Enable View Full CM button
        viewFullCMBtn.disabled = false;
        viewFullCMBtn.title = `View all logs for ${processKey}`;
        
        controlsSection.classList.add('show');
        errorSummary.style.display = 'none';
        
        await loadProcessLogs();
    }

    // Load logs for current process with pagination
    async function loadProcessLogs() {
        if (!cacheKey || !currentProcess) return;

        try {
            logsSection.classList.add('show');
            logDisplay.innerHTML = '<p class="text-center">Loading...</p>';

            const level = levelFilter.value;
            const search = searchInput.value.trim();
            
            const params = new URLSearchParams({
                page: currentPage,
                per_page: 100,
                level: level,
                search: search
            });

            const response = await fetch(`/api/get-process-logs/${encodeURIComponent(cacheKey)}/${encodeURIComponent(currentProcess)}?${params}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            totalPages = result.total_pages;
            displayLogs(result.logs, result.total, result.page, result.total_pages);

        } catch (error) {
            console.error('Error loading logs:', error);
            logDisplay.innerHTML = `<p class="text-danger">Error loading logs: ${error.message}</p>`;
        }
    }

    // Display logs
    function displayLogs(logs, total, page, totalPages) {
        logDisplay.innerHTML = '';
        
        if (logs.length === 0) {
            logDisplay.innerHTML = '<p class="text-muted text-center">No logs to display</p>';
            return;
        }

        // Pagination info
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'alert alert-info';
        paginationInfo.innerHTML = `
            Showing ${logs.length} of ${total} logs (Page ${page} of ${totalPages})
            ${page > 1 ? '<button class="btn btn-sm btn-primary ms-3" id="prevPage">Previous</button>' : ''}
            ${page < totalPages ? '<button class="btn btn-sm btn-primary ms-2" id="nextPage">Next</button>' : ''}
        `;
        logDisplay.appendChild(paginationInfo);

        logs.forEach((log, index) => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';

            const levelClass = log.level === 'E' ? 'error' : log.level === 'W' ? 'warning' : 'debug';
            const levelText = log.level === 'E' ? 'ERROR' : log.level === 'W' ? 'WARNING' : 'DEBUG';

            entry.innerHTML = `
                <div class="log-header ${levelClass}">
                    <div class="log-meta">
                        <span class="log-level ${levelClass}">${levelText}</span>
                        <span><strong>Line:</strong> ${log.lineNumber}</span>
                        <span><strong>Time:</strong> ${log.timestamp}</span>
                        <span><strong>Source:</strong> ${log.sourceFile}</span>
                    </div>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
                <div class="log-body">
                    <div class="log-message">${escapeHtml(log.message)}</div>
                    <div class="log-flist">${escapeHtml(log.flistContent)}</div>
                </div>
            `;

            const header = entry.querySelector('.log-header');
            const body = entry.querySelector('.log-body');
            const icon = entry.querySelector('.toggle-icon');
            
            header.addEventListener('click', () => {
                body.classList.toggle('show');
                icon.classList.toggle('rotated');
            });

            logDisplay.appendChild(entry);
        });

        // Add pagination handlers
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentPage--;
                loadProcessLogs();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentPage++;
                loadProcessLogs();
            });
        }
    }

    // File selector change handler - update the displayed file info
    fileSelector.addEventListener('change', () => {
        const fileName = fileSelector.value;
        if (fileName) {
            selectedFileInfo.textContent = fileName;
        } else {
            selectedFileInfo.textContent = 'All Files (Combined)';
        }
    });

    // Apply filters
    applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        loadProcessLogs();
    });

    // Clear filters
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        levelFilter.value = '';
        errorSummary.style.display = 'none';
        currentPage = 1;
        loadProcessLogs();
    });

    // Show unique errors
    showErrorsBtn.addEventListener('click', async () => {
        if (!cacheKey || !currentProcess) return;

        try {
            const response = await fetch(`/api/get-unique-errors/${encodeURIComponent(cacheKey)}/${encodeURIComponent(currentProcess)}?from_line=0&to_line=999999999`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            errorList.innerHTML = '';
            if (result.errors.length === 0) {
                errorList.innerHTML = '<p class="text-muted">No errors found</p>';
            } else {
                result.errors.forEach(error => {
                    const item = document.createElement('div');
                    item.className = 'error-item';
                    item.innerHTML = `
                        <strong>${escapeHtml(error.message)}</strong><br>
                        <small><strong>Source:</strong> ${escapeHtml(error.sourceFile)} | 
                        <strong>Occurrences:</strong> ${error.count} | 
                        <strong>First at Line:</strong> ${error.firstLine}</small>
                    `;
                    errorList.appendChild(item);
                });
            }

            errorSummary.style.display = 'block';
        } catch (error) {
            console.error('Error getting unique errors:', error);
            alert('Error getting unique errors: ' + error.message);
        }
    });

    // Load file list
    async function loadFileList() {
        if (!cacheKey) return;

        try {
            const response = await fetch(`/api/get-file-list/${encodeURIComponent(cacheKey)}`);
            const result = await response.json();

            if (result.success && result.files) {
                fileSelector.innerHTML = '<option value="">All Files (Combined)</option>';
                result.files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file.name;
                    option.textContent = `${file.name} (${file.lines} lines)`;
                    fileSelector.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading file list:', error);
        }
    }

    // View full file with pagination
    viewFullFileBtn.addEventListener('click', async () => {
        const fileName = fileSelector.value;
        
        if (!cacheKey) {
            alert('Please parse a log file first');
            return;
        }

        try {
            completeLogDisplay.textContent = 'Loading file info...';
            completeLogDisplay.style.display = 'block';
            completeLogStats.style.display = 'block';

            // Get file info to know total lines
            let params = new URLSearchParams({
                from_line: 1,
                to_line: 1,
                file_name: fileName
            });

            let response = await fetch(`/api/get-complete-logs/${encodeURIComponent(cacheKey)}?${params}`);
            let result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            const totalLines = result.totalLines;
            currentFileTotalLines = totalLines;

            // Calculate pages (5000 lines per page)
            const pageSize = 5000;
            currentViewTotalPages = Math.ceil(totalLines / pageSize);
            currentViewPage = 1;

            // Load first page
            await loadFilePage(1, fileName, pageSize, totalLines);

        } catch (error) {
            console.error('Error viewing full file:', error);
            completeLogDisplay.textContent = 'Error: ' + error.message;
            statsText.textContent = 'Error loading file';
        }
    });

    // Load a specific page of the file
    async function loadFilePage(pageNum, fileName, pageSize, totalLines) {
        try {
            const start = (pageNum - 1) * pageSize + 1;
            const end = Math.min(pageNum * pageSize, totalLines);

            statsText.textContent = `Loading page ${pageNum} of ${currentViewTotalPages}...`;

            const params = new URLSearchParams({
                from_line: start,
                to_line: end,
                file_name: fileName
            });

            const response = await fetch(`/api/get-complete-logs/${encodeURIComponent(cacheKey)}?${params}`);
            const result = await response.json();

            if (result.success) {
                completeLogDisplay.textContent = result.rawText;
                completeLogFromLine.value = start;
                completeLogToLine.value = end;
                
                statsText.textContent = `Page ${pageNum} of ${currentViewTotalPages}: Showing lines ${start.toLocaleString()} to ${end.toLocaleString()} of ${totalLines.toLocaleString()} total`;
                
                // Update pagination controls
                paginationControls.style.display = 'block';
                prevPageBtn.disabled = (pageNum === 1);
                nextPageBtn.disabled = (pageNum === currentViewTotalPages);
                pageInfo.textContent = `Page ${pageNum} of ${currentViewTotalPages}`;

                currentViewPage = pageNum;
            }
        } catch (error) {
            console.error('Error loading page:', error);
            completeLogDisplay.textContent = 'Error loading page: ' + error.message;
        }
    }

    // Pagination handlers
    prevPageBtn.addEventListener('click', () => {
        if (currentViewPage > 1) {
            const fileName = fileSelector.value;
            loadFilePage(currentViewPage - 1, fileName, 5000, currentFileTotalLines);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentViewPage < currentViewTotalPages) {
            const fileName = fileSelector.value;
            loadFilePage(currentViewPage + 1, fileName, 5000, currentFileTotalLines);
        }
    });

    // CM selector change handler
    cmSelector.addEventListener('change', () => {
        if (cmSelector.value) {
            viewFullCMBtn.disabled = false;
        } else {
            viewFullCMBtn.disabled = true;
        }
    });

    // View Full CM Process Logs
    viewFullCMBtn.addEventListener('click', async () => {
        const selectedCM = cmSelector.value;
        
        if (!cacheKey || !selectedCM) {
            alert('Please select a CM process first');
            return;
        }

        try {
            completeLogDisplay.textContent = 'Loading all logs for ' + selectedCM + '...';
            completeLogDisplay.style.display = 'block';
            completeLogStats.style.display = 'block';
            paginationControls.style.display = 'none';

            const response = await fetch(`/api/get-full-cm-logs/${encodeURIComponent(cacheKey)}/${encodeURIComponent(selectedCM)}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            completeLogDisplay.textContent = result.rawText;
            statsText.textContent = `Displaying all ${result.totalLogs} log entries for CM process: ${result.processName}`;
            
            // Scroll to the complete log section
            completeLogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Error viewing full CM logs:', error);
            completeLogDisplay.textContent = 'Error: ' + error.message;
            statsText.textContent = 'Error loading CM logs';
        }
    });

    // Set last line button
    setLastLineBtn.addEventListener('click', async () => {
        if (!cacheKey) {
            alert('Please parse a log file first');
            return;
        }

        const fileName = fileSelector.value;

        try {
            const params = new URLSearchParams({
                from_line: 1,
                to_line: 1,
                file_name: fileName
            });

            const response = await fetch(`/api/get-complete-logs/${encodeURIComponent(cacheKey)}?${params}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            currentFileTotalLines = result.totalLines;
            completeLogToLine.value = result.totalLines;
            
            alert(`Set to last line: ${result.totalLines.toLocaleString()}`);

        } catch (error) {
            console.error('Error getting last line:', error);
            alert('Error: ' + error.message);
        }
    });

    // Load complete log view by line number
    loadCompleteLogBtn.addEventListener('click', async () => {
        if (!cacheKey) {
            alert('Please parse a log file first');
            return;
        }

        const from = parseInt(completeLogFromLine.value);
        const to = parseInt(completeLogToLine.value);
        const fileName = fileSelector.value;

        if (!from || !to) {
            alert('Please enter both from and to line numbers');
            return;
        }

        if (from > to) {
            alert('From line must be less than or equal to To line');
            return;
        }

        if (to - from > 5000) {
            alert('Maximum 5000 lines allowed at once. Please reduce the range.');
            return;
        }

        try {
            completeLogDisplay.textContent = 'Loading...';
            completeLogDisplay.style.display = 'block';

            const params = new URLSearchParams({
                from_line: from,
                to_line: to,
                file_name: fileName
            });

            const response = await fetch(`/api/get-complete-logs/${encodeURIComponent(cacheKey)}?${params}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            completeLogDisplay.textContent = result.rawText;
            
            // Show stats
            statsText.textContent = `Displaying ${result.displayedLines} lines (${result.from_line} to ${result.to_line}) of ${result.totalLines} total lines`;
            completeLogStats.style.display = 'block';
            
            // Scroll to the complete log section
            completeLogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Error loading complete logs:', error);
            completeLogDisplay.textContent = 'Error loading logs: ' + error.message;
        }
    });

    // Download individual CM log
    async function downloadCMLog(processKey, processName, processPid) {
        if (!cacheKey) {
            alert('No logs loaded');
            return;
        }

        try {
            const response = await fetch(`/api/get-full-cm-logs/${encodeURIComponent(cacheKey)}/${encodeURIComponent(processKey)}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            // Create a blob and download
            const blob = new Blob([result.rawText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${processName}_${processPid}.log`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log(`Downloaded: ${processName}_${processPid}.log`);
        } catch (error) {
            console.error('Error downloading CM log:', error);
            alert('Error downloading log: ' + error.message);
        }
    }

    // Download all CM logs (as ZIP)
    downloadAllCMBtn.addEventListener('click', async () => {
        if (!cacheKey || !summary) {
            alert('No logs loaded');
            return;
        }

        if (!confirm(`Download ${summary.processes.length} CM log files as a ZIP?`)) {
            return;
        }

        try {
            downloadAllCMBtn.disabled = true;
            downloadAllCMBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';

            const response = await fetch(`/api/download-all-cm-logs/${encodeURIComponent(cacheKey)}`);
            
            if (!response.ok) {
                throw new Error('Failed to download logs');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `brm_cm_logs_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log('Downloaded all CM logs as ZIP');
        } catch (error) {
            console.error('Error downloading all CM logs:', error);
            alert('Error downloading all logs: ' + error.message);
        } finally {
            downloadAllCMBtn.disabled = false;
            downloadAllCMBtn.innerHTML = '<i class="fas fa-download"></i> Download All CM Logs';
        }
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
