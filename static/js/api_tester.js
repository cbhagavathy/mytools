document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const methodSelect = document.getElementById('methodSelect');
    const urlInput = document.getElementById('urlInput');
    const sendBtn = document.getElementById('sendBtn');
    const tabButtons = document.querySelectorAll('.tab-button');
    const authType = document.getElementById('authType');
    const bodyType = document.getElementById('bodyType');
    const formatJsonBtn = document.getElementById('formatJsonBtn');
    const addParamBtn = document.getElementById('addParamBtn');
    const addHeaderBtn = document.getElementById('addHeaderBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const downloadResponseBtn = document.getElementById('downloadResponseBtn');
    const headerKeyValueBtn = document.getElementById('headerKeyValueBtn');
    const headerBulkBtn = document.getElementById('headerBulkBtn');
    const headerKeyValueMode = document.getElementById('headerKeyValueMode');
    const headerBulkMode = document.getElementById('headerBulkMode');
    const headerBulkEdit = document.getElementById('headerBulkEdit');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    let requestHistory = JSON.parse(localStorage.getItem('apiTesterHistory') || '[]');
    let lastResponse = null;
    let headerMode = 'keyvalue'; // 'keyvalue' or 'bulk'
    let collections = JSON.parse(localStorage.getItem('apiTesterCollections') || '{}');
    
    // Collections DOM elements
    const newFolderBtn = document.getElementById('newFolderBtn');
    const saveRequestBtn = document.getElementById('saveRequestBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    const newFolderModal = new bootstrap.Modal(document.getElementById('newFolderModal'));
    const saveRequestModal = new bootstrap.Modal(document.getElementById('saveRequestModal'));
    
    // Initialize
    renderHistory();
    renderCollections();
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
    
    // Auth type change
    authType.addEventListener('change', function() {
        document.getElementById('authBearer').style.display = 'none';
        document.getElementById('authBasic').style.display = 'none';
        document.getElementById('authApiKey').style.display = 'none';
        
        if (this.value === 'bearer') {
            document.getElementById('authBearer').style.display = 'block';
        } else if (this.value === 'basic') {
            document.getElementById('authBasic').style.display = 'block';
        } else if (this.value === 'apikey') {
            document.getElementById('authApiKey').style.display = 'block';
        }
    });
    
    // Add parameter row
    addParamBtn.addEventListener('click', function() {
        const container = document.getElementById('paramsContainer');
        const row = document.createElement('div');
        row.className = 'param-row';
        row.innerHTML = `
            <input type="checkbox" class="form-check-input" checked>
            <input type="text" placeholder="Key" class="param-key">
            <input type="text" placeholder="Value" class="param-value">
            <button class="btn btn-sm btn-outline-danger remove-param">
                <i class="bi bi-trash"></i>
            </button>
        `;
        container.appendChild(row);
        attachParamRemoveHandler(row);
    });
    
    // Add header row
    addHeaderBtn.addEventListener('click', function() {
        const container = document.getElementById('headersContainer');
        const row = document.createElement('div');
        row.className = 'header-row';
        row.innerHTML = `
            <input type="checkbox" class="form-check-input" checked>
            <input type="text" placeholder="Key" class="header-key">
            <input type="text" placeholder="Value" class="header-value">
            <button class="btn btn-sm btn-outline-danger remove-header">
                <i class="bi bi-trash"></i>
            </button>
        `;
        container.appendChild(row);
        attachHeaderRemoveHandler(row);
    });
    
    // Header mode switching
    headerKeyValueBtn.addEventListener('click', function() {
        if (headerMode === 'bulk') {
            // Convert bulk to key-value
            bulkToKeyValue();
        }
        headerMode = 'keyvalue';
        headerKeyValueBtn.classList.add('active');
        headerBulkBtn.classList.remove('active');
        headerKeyValueMode.style.display = 'block';
        headerBulkMode.style.display = 'none';
    });
    
    headerBulkBtn.addEventListener('click', function() {
        if (headerMode === 'keyvalue') {
            // Convert key-value to bulk
            keyValueToBulk();
        }
        headerMode = 'bulk';
        headerBulkBtn.classList.add('active');
        headerKeyValueBtn.classList.remove('active');
        headerBulkMode.style.display = 'block';
        headerKeyValueMode.style.display = 'none';
    });
    
    // Attach remove handlers
    function attachParamRemoveHandler(row) {
        row.querySelector('.remove-param').addEventListener('click', function() {
            row.remove();
        });
    }
    
    function attachHeaderRemoveHandler(row) {
        row.querySelector('.remove-header').addEventListener('click', function() {
            row.remove();
        });
    }
    
    // Format JSON
    formatJsonBtn.addEventListener('click', function() {
        const bodyContent = document.getElementById('bodyContent');
        try {
            const json = JSON.parse(bodyContent.value);
            bodyContent.value = JSON.stringify(json, null, 2);
            showNotification('JSON formatted successfully', 'success');
        } catch (e) {
            showNotification('Invalid JSON: ' + e.message, 'error');
        }
    });
    
    // Send Request
    sendBtn.addEventListener('click', async function() {
        const method = methodSelect.value;
        let url = urlInput.value.trim();
        
        if (!url) {
            showNotification('Please enter a URL', 'warning');
            return;
        }
        
        // Add protocol if missing
        if (!url.match(/^https?:\/\//i)) {
            url = 'https://' + url;
            urlInput.value = url;
        }
        
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
        
        try {
            // Build request
            const requestData = {
                method: method,
                url: url,
                headers: getHeaders(),
                body: getBody(),
                bodyType: bodyType.value
            };
            
            // Send via our proxy endpoint
            const response = await fetch('/api/send-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                displayResponse(result);
                addToHistory(method, url, result.status);
                showNotification(`Request completed: ${result.status} ${result.statusText}`, 'success');
            } else {
                showNotification(`Error: ${result.error}`, 'error');
                displayError(result);
            }
            
        } catch (error) {
            showNotification('Request failed: ' + error.message, 'error');
            console.error(error);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="bi bi-send"></i> Send';
        }
    });
    
    // Convert key-value headers to bulk format
    function keyValueToBulk() {
        const rows = document.querySelectorAll('#headersContainer .header-row');
        let bulkText = '';
        
        rows.forEach(row => {
            const checkbox = row.querySelector('.form-check-input');
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            
            if (key && value) {
                // Add comment if disabled
                const prefix = checkbox.checked ? '' : '# ';
                bulkText += `${prefix}${key}: ${value}\n`;
            }
        });
        
        headerBulkEdit.value = bulkText;
    }
    
    // Convert bulk format to key-value headers
    function bulkToKeyValue() {
        const bulkText = headerBulkEdit.value;
        const lines = bulkText.split('\n');
        const container = document.getElementById('headersContainer');
        
        // Clear existing headers
        container.innerHTML = '';
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return; // Skip empty lines
            
            // Check if line is commented (disabled)
            const isEnabled = !line.startsWith('#');
            const cleanLine = isEnabled ? line : line.substring(1).trim();
            
            // Parse key: value
            const colonIndex = cleanLine.indexOf(':');
            if (colonIndex === -1) return; // Skip invalid lines
            
            const key = cleanLine.substring(0, colonIndex).trim();
            const value = cleanLine.substring(colonIndex + 1).trim();
            
            if (key && value) {
                const row = document.createElement('div');
                row.className = 'header-row';
                row.innerHTML = `
                    <input type="checkbox" class="form-check-input" ${isEnabled ? 'checked' : ''}>
                    <input type="text" placeholder="Key" class="header-key" value="${escapeHtml(key)}">
                    <input type="text" placeholder="Value" class="header-value" value="${escapeHtml(value)}">
                    <button class="btn btn-sm btn-outline-danger remove-header">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                container.appendChild(row);
                attachHeaderRemoveHandler(row);
            }
        });
        
        // Add at least one empty row if none exist
        if (container.children.length === 0) {
            const row = document.createElement('div');
            row.className = 'header-row';
            row.innerHTML = `
                <input type="checkbox" class="form-check-input" checked>
                <input type="text" placeholder="Key" class="header-key" value="Content-Type">
                <input type="text" placeholder="Value" class="header-value" value="application/json">
                <button class="btn btn-sm btn-outline-danger remove-header" style="display:none;">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            container.appendChild(row);
            attachHeaderRemoveHandler(row);
        }
    }
    
    // Escape HTML for attributes
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Get headers
    function getHeaders() {
        const headers = {};
        
        // If in bulk mode, parse from textarea
        if (headerMode === 'bulk') {
            const bulkText = headerBulkEdit.value;
            const lines = bulkText.split('\n');
            
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return; // Skip empty or commented lines
                
                const colonIndex = line.indexOf(':');
                if (colonIndex === -1) return;
                
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                
                if (key && value) {
                    headers[key] = value;
                }
            });
        } else {
            // Key-value mode
            const rows = document.querySelectorAll('#headersContainer .header-row');
            
            rows.forEach(row => {
                const checkbox = row.querySelector('.form-check-input');
                const key = row.querySelector('.header-key').value.trim();
                const value = row.querySelector('.header-value').value.trim();
                
                if (checkbox.checked && key && value) {
                    headers[key] = value;
                }
            });
        }
        
        // Add auth headers
        if (authType.value === 'bearer') {
            const token = document.getElementById('bearerToken').value.trim();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        } else if (authType.value === 'basic') {
            const username = document.getElementById('basicUsername').value.trim();
            const password = document.getElementById('basicPassword').value.trim();
            if (username && password) {
                const encoded = btoa(`${username}:${password}`);
                headers['Authorization'] = `Basic ${encoded}`;
            }
        } else if (authType.value === 'apikey') {
            const keyName = document.getElementById('apiKeyName').value.trim();
            const keyValue = document.getElementById('apiKeyValue').value.trim();
            const location = document.getElementById('apiKeyLocation').value;
            
            if (keyName && keyValue && location === 'header') {
                headers[keyName] = keyValue;
            }
        }
        
        return headers;
    }
    
    // Get body
    function getBody() {
        const bodyTypeValue = bodyType.value;
        
        if (bodyTypeValue === 'none') {
            return '';
        }
        
        return document.getElementById('bodyContent').value;
    }
    
    // Display response
    function displayResponse(result) {
        lastResponse = result;
        
        const responseSection = document.getElementById('responseSection');
        responseSection.classList.add('show');
        
        // Status
        const statusBadge = document.getElementById('responseStatus');
        statusBadge.textContent = `${result.status} ${result.statusText}`;
        statusBadge.className = 'status-badge ' + getStatusClass(result.status);
        
        // Time and size
        document.getElementById('responseTime').textContent = result.duration;
        document.getElementById('responseSize').textContent = formatBytes(result.size);
        
        // Body
        const responseBody = document.getElementById('responseBody').querySelector('pre');
        if (result.contentType === 'json' && typeof result.body === 'object') {
            responseBody.textContent = JSON.stringify(result.body, null, 2);
        } else {
            responseBody.textContent = result.body;
        }
        
        // Headers
        const responseHeaders = document.getElementById('responseHeaders').querySelector('pre');
        responseHeaders.textContent = JSON.stringify(result.headers, null, 2);
        
        // Scroll to response
        responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Display error
    function displayError(result) {
        lastResponse = result;
        
        const responseSection = document.getElementById('responseSection');
        responseSection.classList.add('show');
        
        const statusBadge = document.getElementById('responseStatus');
        statusBadge.textContent = result.error || 'Error';
        statusBadge.className = 'status-badge status-server-error';
        
        document.getElementById('responseTime').textContent = '0';
        document.getElementById('responseSize').textContent = '0';
        
        const responseBody = document.getElementById('responseBody').querySelector('pre');
        responseBody.textContent = result.message || 'An error occurred';
        
        responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Get status class
    function getStatusClass(status) {
        if (status >= 200 && status < 300) return 'status-success';
        if (status >= 300 && status < 400) return 'status-redirect';
        if (status >= 400 && status < 500) return 'status-client-error';
        return 'status-server-error';
    }
    
    // Format bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // Add to history
    function addToHistory(method, url, status) {
        const historyItem = {
            method,
            url,
            status,
            timestamp: new Date().toISOString()
        };
        
        requestHistory.unshift(historyItem);
        
        // Keep only last 20 items
        if (requestHistory.length > 20) {
            requestHistory = requestHistory.slice(0, 20);
        }
        
        localStorage.setItem('apiTesterHistory', JSON.stringify(requestHistory));
        renderHistory();
    }
    
    // Render history
    function renderHistory() {
        const container = document.getElementById('historyContainer');
        
        if (requestHistory.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No requests yet</p>';
            return;
        }
        
        container.innerHTML = '';
        
        requestHistory.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div>
                    <span class="method-badge method-${item.method}">${item.method}</span>
                    <span class="history-url">${truncateUrl(item.url)}</span>
                </div>
                <div class="history-time">
                    ${formatTimeAgo(item.timestamp)} - Status: ${item.status}
                </div>
            `;
            
            div.addEventListener('click', function() {
                loadHistoryItem(item);
            });
            
            container.appendChild(div);
        });
    }
    
    // Load history item
    function loadHistoryItem(item) {
        methodSelect.value = item.method;
        urlInput.value = item.url;
        showNotification('Request loaded from history', 'info');
    }
    
    // Clear history
    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('Clear all history?')) {
            requestHistory = [];
            localStorage.removeItem('apiTesterHistory');
            renderHistory();
            showNotification('History cleared', 'success');
        }
    });
    
    // Download response
    downloadResponseBtn.addEventListener('click', function() {
        if (!lastResponse) {
            showNotification('No response to download', 'warning');
            return;
        }
        
        let content;
        let filename = 'response.json';
        
        if (lastResponse.contentType === 'json') {
            content = JSON.stringify(lastResponse.body, null, 2);
            filename = 'response.json';
        } else {
            content = lastResponse.body;
            filename = 'response.txt';
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Response downloaded', 'success');
    });
    
    // Utility functions
    function truncateUrl(url) {
        return url.length > 60 ? url.substring(0, 57) + '...' : url;
    }
    
    function formatTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        return Math.floor(seconds / 86400) + ' days ago';
    }
    
    function showNotification(message, type) {
        toastMessage.textContent = message;
        toastMessage.className = 'toast-body';
        
        if (type === 'success') {
            toastMessage.classList.add('bg-success', 'text-white');
        } else if (type === 'error') {
            toastMessage.classList.add('bg-danger', 'text-white');
        } else if (type === 'warning') {
            toastMessage.classList.add('bg-warning');
        } else {
            toastMessage.classList.add('bg-info', 'text-white');
        }
        
        toast.show();
    }
    
    // ============ COLLECTIONS FUNCTIONALITY ============
    
    // New Folder
    newFolderBtn.addEventListener('click', function() {
        document.getElementById('newFolderName').value = '';
        newFolderModal.show();
    });
    
    document.getElementById('createFolderBtn').addEventListener('click', function() {
        const folderName = document.getElementById('newFolderName').value.trim();
        
        if (!folderName) {
            showNotification('Please enter a folder name', 'warning');
            return;
        }
        
        if (collections[folderName]) {
            showNotification('Folder already exists', 'warning');
            return;
        }
        
        collections[folderName] = [];
        saveCollections();
        renderCollections();
        newFolderModal.hide();
        showNotification('Folder created successfully', 'success');
    });
    
    // Save Request
    saveRequestBtn.addEventListener('click', function() {
        const url = urlInput.value.trim();
        
        if (!url) {
            showNotification('Please enter a URL before saving', 'warning');
            return;
        }
        
        // Populate folder dropdown
        const folderSelect = document.getElementById('folderSelect');
        folderSelect.innerHTML = '<option value="">-- Select a folder --</option>';
        
        Object.keys(collections).forEach(folderName => {
            const option = document.createElement('option');
            option.value = folderName;
            option.textContent = folderName;
            folderSelect.appendChild(option);
        });
        
        document.getElementById('requestName').value = '';
        saveRequestModal.show();
    });
    
    document.getElementById('confirmSaveBtn').addEventListener('click', function() {
        const requestName = document.getElementById('requestName').value.trim();
        const folderName = document.getElementById('folderSelect').value;
        
        if (!requestName) {
            showNotification('Please enter a request name', 'warning');
            return;
        }
        
        if (!folderName) {
            showNotification('Please select a folder', 'warning');
            return;
        }
        
        // Capture current request state
        const requestData = {
            name: requestName,
            method: methodSelect.value,
            url: urlInput.value.trim(),
            authType: authType.value,
            authData: getAuthData(),
            headers: getAllHeaders(),
            bodyType: bodyType.value,
            body: document.getElementById('bodyContent').value,
            params: getParams(),
            timestamp: new Date().toISOString()
        };
        
        collections[folderName].push(requestData);
        saveCollections();
        renderCollections();
        saveRequestModal.hide();
        showNotification('Request saved successfully', 'success');
    });
    
    // Get auth data
    function getAuthData() {
        if (authType.value === 'bearer') {
            return { token: document.getElementById('bearerToken').value };
        } else if (authType.value === 'basic') {
            return {
                username: document.getElementById('basicUsername').value,
                password: document.getElementById('basicPassword').value
            };
        } else if (authType.value === 'apikey') {
            return {
                keyName: document.getElementById('apiKeyName').value,
                keyValue: document.getElementById('apiKeyValue').value,
                location: document.getElementById('apiKeyLocation').value
            };
        }
        return null;
    }
    
    // Get all headers (including disabled ones)
    function getAllHeaders() {
        const headersList = [];
        const rows = document.querySelectorAll('#headersContainer .header-row');
        
        rows.forEach(row => {
            const checkbox = row.querySelector('.form-check-input');
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            
            if (key && value) {
                headersList.push({
                    key,
                    value,
                    enabled: checkbox.checked
                });
            }
        });
        
        return headersList;
    }
    
    // Get params
    function getParams() {
        const paramsList = [];
        const rows = document.querySelectorAll('#paramsContainer .param-row');
        
        rows.forEach(row => {
            const checkbox = row.querySelector('.form-check-input');
            const key = row.querySelector('.param-key').value.trim();
            const value = row.querySelector('.param-value').value.trim();
            
            if (key && value) {
                paramsList.push({
                    key,
                    value,
                    enabled: checkbox.checked
                });
            }
        });
        
        return paramsList;
    }
    
    // Load saved request
    function loadSavedRequest(requestData) {
        // Set basic info
        methodSelect.value = requestData.method;
        urlInput.value = requestData.url;
        
        // Set auth
        authType.value = requestData.authType || 'none';
        authType.dispatchEvent(new Event('change'));
        
        if (requestData.authData) {
            if (requestData.authType === 'bearer') {
                document.getElementById('bearerToken').value = requestData.authData.token || '';
            } else if (requestData.authType === 'basic') {
                document.getElementById('basicUsername').value = requestData.authData.username || '';
                document.getElementById('basicPassword').value = requestData.authData.password || '';
            } else if (requestData.authType === 'apikey') {
                document.getElementById('apiKeyName').value = requestData.authData.keyName || '';
                document.getElementById('apiKeyValue').value = requestData.authData.keyValue || '';
                document.getElementById('apiKeyLocation').value = requestData.authData.location || 'header';
            }
        }
        
        // Set headers
        const headersContainer = document.getElementById('headersContainer');
        headersContainer.innerHTML = '';
        
        if (requestData.headers && requestData.headers.length > 0) {
            requestData.headers.forEach(header => {
                const row = document.createElement('div');
                row.className = 'header-row';
                row.innerHTML = `
                    <input type="checkbox" class="form-check-input" ${header.enabled ? 'checked' : ''}>
                    <input type="text" placeholder="Key" class="header-key" value="${escapeHtml(header.key)}">
                    <input type="text" placeholder="Value" class="header-value" value="${escapeHtml(header.value)}">
                    <button class="btn btn-sm btn-outline-danger remove-header">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                headersContainer.appendChild(row);
                attachHeaderRemoveHandler(row);
            });
        } else {
            // Add default header row
            const row = document.createElement('div');
            row.className = 'header-row';
            row.innerHTML = `
                <input type="checkbox" class="form-check-input" checked>
                <input type="text" placeholder="Key" class="header-key" value="Content-Type">
                <input type="text" placeholder="Value" class="header-value" value="application/json">
                <button class="btn btn-sm btn-outline-danger remove-header" style="display:none;">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            headersContainer.appendChild(row);
            attachHeaderRemoveHandler(row);
        }
        
        // Set params
        const paramsContainer = document.getElementById('paramsContainer');
        paramsContainer.innerHTML = '';
        
        if (requestData.params && requestData.params.length > 0) {
            requestData.params.forEach(param => {
                const row = document.createElement('div');
                row.className = 'param-row';
                row.innerHTML = `
                    <input type="checkbox" class="form-check-input" ${param.enabled ? 'checked' : ''}>
                    <input type="text" placeholder="Key" class="param-key" value="${escapeHtml(param.key)}">
                    <input type="text" placeholder="Value" class="param-value" value="${escapeHtml(param.value)}">
                    <button class="btn btn-sm btn-outline-danger remove-param">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                paramsContainer.appendChild(row);
                attachParamRemoveHandler(row);
            });
        } else {
            // Add default param row
            const row = document.createElement('div');
            row.className = 'param-row';
            row.innerHTML = `
                <input type="checkbox" class="form-check-input">
                <input type="text" placeholder="Key" class="param-key">
                <input type="text" placeholder="Value" class="param-value">
                <button class="btn btn-sm btn-outline-danger remove-param" style="display:none;">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            paramsContainer.appendChild(row);
            attachParamRemoveHandler(row);
        }
        
        // Set body
        bodyType.value = requestData.bodyType || 'none';
        document.getElementById('bodyContent').value = requestData.body || '';
        
        showNotification(`Loaded: ${requestData.name}`, 'success');
    }
    
    // Render collections
    function renderCollections() {
        const container = document.getElementById('collectionsContainer');
        
        if (Object.keys(collections).length === 0) {
            container.innerHTML = '<p class="text-muted text-center small">No collections yet</p>';
            return;
        }
        
        container.innerHTML = '';
        
        Object.keys(collections).sort().forEach(folderName => {
            const folder = collections[folderName];
            
            // Folder header
            const folderDiv = document.createElement('div');
            folderDiv.className = 'collection-folder';
            folderDiv.innerHTML = `
                <div>
                    <i class="bi bi-folder folder-icon"></i>
                    <span>${escapeHtml(folderName)}</span>
                    <small class="text-muted ms-2">(${folder.length})</small>
                </div>
                <div class="folder-actions">
                    <button class="action-btn delete-folder" title="Delete folder">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            
            // Toggle folder collapse
            const folderToggle = folderDiv.querySelector('div:first-child');
            folderToggle.addEventListener('click', function() {
                const itemsDiv = folderDiv.nextElementSibling;
                if (itemsDiv && itemsDiv.classList.contains('folder-items')) {
                    itemsDiv.style.display = itemsDiv.style.display === 'none' ? 'block' : 'none';
                }
            });
            
            // Delete folder
            folderDiv.querySelector('.delete-folder').addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(`Delete folder "${folderName}" and all its requests?`)) {
                    delete collections[folderName];
                    saveCollections();
                    renderCollections();
                    showNotification('Folder deleted', 'success');
                }
            });
            
            container.appendChild(folderDiv);
            
            // Folder items
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'folder-items';
            
            folder.forEach((request, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'collection-item';
                itemDiv.innerHTML = `
                    <div>
                        <span class="method-badge method-${request.method}" style="font-size: 0.7rem; padding: 2px 8px; min-width: 50px;">${request.method}</span>
                        <span class="ms-2">${escapeHtml(request.name)}</span>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn delete-request" title="Delete request">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
                
                // Load request
                itemDiv.addEventListener('click', function(e) {
                    if (!e.target.closest('.delete-request')) {
                        loadSavedRequest(request);
                    }
                });
                
                // Delete request
                itemDiv.querySelector('.delete-request').addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (confirm(`Delete request "${request.name}"?`)) {
                        collections[folderName].splice(index, 1);
                        saveCollections();
                        renderCollections();
                        showNotification('Request deleted', 'success');
                    }
                });
                
                itemsDiv.appendChild(itemDiv);
            });
            
            container.appendChild(itemsDiv);
        });
    }
    
    // Save collections to localStorage
    function saveCollections() {
        localStorage.setItem('apiTesterCollections', JSON.stringify(collections));
    }
    
    // Export configuration
    exportBtn.addEventListener('click', function() {
        const config = {
            collections: collections,
            history: requestHistory,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-tester-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Configuration exported successfully', 'success');
    });
    
    // Import configuration
    importBtn.addEventListener('click', function() {
        importFileInput.click();
    });
    
    importFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const config = JSON.parse(event.target.result);
                
                if (!config.collections) {
                    throw new Error('Invalid configuration file');
                }
                
                // Merge or replace?
                const merge = confirm('Merge with existing collections? (Cancel to replace)');
                
                if (merge) {
                    // Merge collections
                    Object.keys(config.collections).forEach(folderName => {
                        if (collections[folderName]) {
                            collections[folderName] = collections[folderName].concat(config.collections[folderName]);
                        } else {
                            collections[folderName] = config.collections[folderName];
                        }
                    });
                } else {
                    // Replace collections
                    collections = config.collections;
                }
                
                saveCollections();
                renderCollections();
                
                // Optionally merge history
                if (config.history && merge) {
                    requestHistory = [...config.history, ...requestHistory].slice(0, 20);
                    localStorage.setItem('apiTesterHistory', JSON.stringify(requestHistory));
                    renderHistory();
                }
                
                showNotification('Configuration imported successfully', 'success');
            } catch (error) {
                showNotification('Error importing configuration: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
        
        // Reset input
        importFileInput.value = '';
    });
});

