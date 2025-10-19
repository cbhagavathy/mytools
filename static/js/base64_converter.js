document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const conversionModeBtns = document.querySelectorAll('.conversion-mode-btn');
    const base64Input = document.getElementById('base64Input');
    const decodeBtn = document.getElementById('decodeBtn');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const fileTypeSelect = document.getElementById('fileTypeSelect');
    const fileUploadZone = document.getElementById('fileUploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const encodeFileBtn = document.getElementById('encodeFileBtn');
    const textInput = document.getElementById('textInput');
    const encodeTextBtn = document.getElementById('encodeTextBtn');
    const base64TextInput = document.getElementById('base64TextInput');
    const decodeTextBtn = document.getElementById('decodeTextBtn');
    const previewContainer = document.getElementById('previewContainer');
    const outputText = document.getElementById('outputText');
    const outputStats = document.getElementById('outputStats');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    let currentMode = 'to-file';
    let currentOutput = null;
    let currentFileName = 'download';
    
    // Conversion mode switching
    conversionModeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            switchMode(mode);
        });
    });
    
    function switchMode(mode) {
        currentMode = mode;
        
        // Update button states
        conversionModeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
            }
        });
        
        // Hide all sections
        document.querySelectorAll('.conversion-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show relevant section
        document.getElementById(`section-${mode}`).style.display = 'block';
        
        // Reset preview
        resetPreview();
    }
    
    // Base64 to File Decode
    decodeBtn.addEventListener('click', function() {
        const base64String = base64Input.value.trim();
        
        if (!base64String) {
            showNotification('Please enter a Base64 string', 'warning');
            return;
        }
        
        try {
            const fileType = fileTypeSelect.value;
            decodeBase64ToFile(base64String, fileType);
            showNotification('Decoded successfully!', 'success');
        } catch (error) {
            showNotification('Error decoding Base64: ' + error.message, 'error');
        }
    });
    
    function decodeBase64ToFile(base64String, fileType) {
        // Remove data URL prefix if present
        const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
        
        // Decode base64
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob
        const mimeType = getMimeType(fileType);
        const blob = new Blob([bytes], { type: mimeType });
        currentOutput = blob;
        currentFileName = `decoded.${fileType}`;
        
        // Preview
        if (fileType === 'pdf') {
            previewPDF(blob);
        } else if (['png', 'jpg', 'gif', 'svg'].includes(fileType)) {
            previewImage(blob);
        } else {
            previewText(blob);
        }
        
        // Enable buttons
        downloadBtn.disabled = false;
        copyOutputBtn.disabled = true;
        
        // Update stats
        updateStats(blob.size, 0);
    }
    
    // File Upload Handling
    fileUploadZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileUploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    fileUploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    fileUploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            handleFileSelect(this.files[0]);
        }
    });
    
    function handleFileSelect(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatBytes(file.size);
        document.getElementById('fileType').textContent = file.type || 'Unknown';
        fileInfo.style.display = 'block';
        encodeFileBtn.disabled = false;
        encodeFileBtn.dataset.file = 'selected';
        window.selectedFile = file;
    }
    
    // Encode File to Base64
    encodeFileBtn.addEventListener('click', function() {
        if (!window.selectedFile) {
            showNotification('Please select a file first', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64String = e.target.result;
            currentOutput = base64String;
            displayBase64Output(base64String);
            showNotification('File encoded successfully!', 'success');
        };
        reader.onerror = function() {
            showNotification('Error reading file', 'error');
        };
        reader.readAsDataURL(window.selectedFile);
    });
    
    // Text to Base64
    encodeTextBtn.addEventListener('click', function() {
        const text = textInput.value;
        
        if (!text) {
            showNotification('Please enter text to encode', 'warning');
            return;
        }
        
        try {
            const base64String = btoa(unescape(encodeURIComponent(text)));
            currentOutput = base64String;
            displayBase64Output(base64String);
            showNotification('Text encoded successfully!', 'success');
        } catch (error) {
            showNotification('Error encoding text: ' + error.message, 'error');
        }
    });
    
    // Base64 to Text
    decodeTextBtn.addEventListener('click', function() {
        const base64String = base64TextInput.value.trim();
        
        if (!base64String) {
            showNotification('Please enter a Base64 string', 'warning');
            return;
        }
        
        try {
            const text = decodeURIComponent(escape(atob(base64String)));
            currentOutput = text;
            displayTextOutput(text);
            showNotification('Decoded successfully!', 'success');
        } catch (error) {
            showNotification('Error decoding: ' + error.message, 'error');
        }
    });
    
    // Preview Functions
    function previewPDF(blob) {
        const url = URL.createObjectURL(blob);
        previewContainer.innerHTML = `
            <iframe src="${url}" width="100%" height="500px" style="border: none; border-radius: 8px;"></iframe>
            <p class="mt-2"><small class="text-muted">PDF Preview</small></p>
        `;
    }
    
    function previewImage(blob) {
        const url = URL.createObjectURL(blob);
        previewContainer.innerHTML = `
            <img src="${url}" class="preview-image" alt="Preview">
            <p class="mt-2"><small class="text-muted">Image Preview</small></p>
        `;
    }
    
    function previewText(blob) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContainer.innerHTML = `
                <pre style="text-align: left; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(e.target.result)}</pre>
            `;
        };
        reader.readAsText(blob);
    }
    
    function displayBase64Output(base64String) {
        outputText.style.display = 'block';
        outputText.value = base64String;
        previewContainer.style.display = 'none';
        downloadBtn.disabled = false;
        copyOutputBtn.disabled = false;
        updateStats(base64String.length, base64String.length);
    }
    
    function displayTextOutput(text) {
        outputText.style.display = 'block';
        outputText.value = text;
        previewContainer.style.display = 'none';
        downloadBtn.disabled = false;
        copyOutputBtn.disabled = false;
        updateStats(text.length, text.length);
    }
    
    function resetPreview() {
        previewContainer.style.display = 'block';
        previewContainer.innerHTML = `
            <div class="text-muted">
                <i class="bi bi-eye-slash" style="font-size: 48px;"></i>
                <p class="mt-3">Preview will appear here</p>
            </div>
        `;
        outputText.style.display = 'none';
        outputText.value = '';
        outputStats.style.display = 'none';
        downloadBtn.disabled = true;
        copyOutputBtn.disabled = true;
        currentOutput = null;
    }
    
    // Download
    downloadBtn.addEventListener('click', function() {
        if (!currentOutput) {
            showNotification('Nothing to download', 'warning');
            return;
        }
        
        let blob, filename;
        
        if (currentOutput instanceof Blob) {
            blob = currentOutput;
            filename = currentFileName;
        } else if (typeof currentOutput === 'string') {
            // Base64 or text output
            if (currentMode === 'to-base64' || currentMode === 'text-to-base64') {
                blob = new Blob([currentOutput], { type: 'text/plain' });
                filename = 'base64_output.txt';
            } else {
                blob = new Blob([currentOutput], { type: 'text/plain' });
                filename = 'decoded_text.txt';
            }
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Downloaded successfully!', 'success');
    });
    
    // Copy to Clipboard
    copyOutputBtn.addEventListener('click', function() {
        if (outputText.value) {
            outputText.select();
            document.execCommand('copy');
            showNotification('Copied to clipboard!', 'success');
        }
    });
    
    // Clear Input
    clearInputBtn.addEventListener('click', function() {
        base64Input.value = '';
        resetPreview();
    });
    
    // Utility Functions
    function getMimeType(fileType) {
        const mimeTypes = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'txt': 'text/plain',
            'json': 'application/json',
            'xml': 'application/xml'
        };
        return mimeTypes[fileType] || 'application/octet-stream';
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    function updateStats(size, chars) {
        document.getElementById('outputSize').textContent = formatBytes(size);
        document.getElementById('outputChars').textContent = chars;
        outputStats.style.display = 'block';
    }
    
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
});

