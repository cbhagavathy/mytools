document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const jsonInput = document.getElementById('jsonInput');
    const jsonOutput = document.getElementById('jsonOutput');
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const copyBtn = document.getElementById('copyBtn');
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    const clearBtn = document.getElementById('clearBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    const sortKeysCheckbox = document.getElementById('sortKeys');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    let currentJSON = null;
    
    // Format JSON
    formatBtn.addEventListener('click', function() {
        const input = jsonInput.value.trim();
        
        if (!input) {
            showError('Please enter JSON data');
            return;
        }
        
        try {
            let parsed = JSON.parse(input);
            
            // Sort keys if option is checked
            if (sortKeysCheckbox.checked) {
                parsed = sortObjectKeys(parsed);
            }
            
            const indent = getIndentValue();
            const formatted = JSON.stringify(parsed, null, indent);
            
            currentJSON = formatted;
            displayOutput(formatted);
            updateStatistics(formatted, parsed);
            hideError();
            showSuccess('JSON formatted successfully!');
            showNotification('JSON formatted successfully!', 'success');
        } catch (e) {
            showError('Invalid JSON: ' + e.message);
            showNotification('Invalid JSON', 'error');
        }
    });
    
    // Minify JSON
    minifyBtn.addEventListener('click', function() {
        const input = jsonInput.value.trim();
        
        if (!input) {
            showError('Please enter JSON data');
            return;
        }
        
        try {
            const parsed = JSON.parse(input);
            const minified = JSON.stringify(parsed);
            
            currentJSON = minified;
            displayOutput(minified);
            updateStatistics(minified, parsed);
            hideError();
            showSuccess('JSON minified successfully!');
            showNotification('JSON minified successfully!', 'success');
        } catch (e) {
            showError('Invalid JSON: ' + e.message);
            showNotification('Invalid JSON', 'error');
        }
    });
    
    // Copy Input
    copyBtn.addEventListener('click', function() {
        if (!jsonInput.value) {
            showNotification('Nothing to copy', 'warning');
            return;
        }
        
        jsonInput.select();
        document.execCommand('copy');
        showNotification('Input copied to clipboard!', 'success');
    });
    
    // Copy Output
    copyOutputBtn.addEventListener('click', function() {
        if (!currentJSON) {
            showNotification('Nothing to copy', 'warning');
            return;
        }
        
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = currentJSON;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        
        showNotification('Output copied to clipboard!', 'success');
    });
    
    // Clear
    clearBtn.addEventListener('click', function() {
        jsonInput.value = '';
        jsonOutput.querySelector('code').textContent = 'Formatted JSON will appear here...';
        currentJSON = null;
        hideError();
        hideSuccess();
        copyOutputBtn.style.display = 'none';
        resetStatistics();
        showNotification('Cleared', 'info');
    });
    
    // Sort keys option change
    sortKeysCheckbox.addEventListener('change', function() {
        if (currentJSON) {
            formatBtn.click(); // Re-format with new option
        }
    });
    
    // Indent option change
    document.querySelectorAll('input[name="indent"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (currentJSON) {
                formatBtn.click(); // Re-format with new indent
            }
        });
    });
    
    // Display output
    function displayOutput(json) {
        const codeElement = jsonOutput.querySelector('code');
        codeElement.textContent = json;
        
        // Apply syntax highlighting
        Prism.highlightElement(codeElement);
        
        // Show copy button
        copyOutputBtn.style.display = 'block';
    }
    
    // Sort object keys recursively
    function sortObjectKeys(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => sortObjectKeys(item));
        } else if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj)
                .sort()
                .reduce((sorted, key) => {
                    sorted[key] = sortObjectKeys(obj[key]);
                    return sorted;
                }, {});
        }
        return obj;
    }
    
    // Get indent value
    function getIndentValue() {
        const selectedRadio = document.querySelector('input[name="indent"]:checked');
        return parseInt(selectedRadio.value);
    }
    
    // Update statistics
    function updateStatistics(jsonString, parsed) {
        const lines = jsonString.split('\n').length;
        const chars = jsonString.length;
        const size = new Blob([jsonString]).size;
        
        document.getElementById('statLines').textContent = lines;
        document.getElementById('statChars').textContent = chars.toLocaleString();
        document.getElementById('statSize').textContent = formatBytes(size);
        
        const stats = countJSONElements(parsed);
        document.getElementById('statObjects').textContent = stats.objects;
        document.getElementById('statArrays').textContent = stats.arrays;
        document.getElementById('statKeys').textContent = stats.keys;
    }
    
    // Reset statistics
    function resetStatistics() {
        document.getElementById('statLines').textContent = '0';
        document.getElementById('statChars').textContent = '0';
        document.getElementById('statSize').textContent = '0 B';
        document.getElementById('statObjects').textContent = '0';
        document.getElementById('statArrays').textContent = '0';
        document.getElementById('statKeys').textContent = '0';
    }
    
    // Count JSON elements
    function countJSONElements(obj) {
        let objects = 0;
        let arrays = 0;
        let keys = 0;
        
        function traverse(item) {
            if (Array.isArray(item)) {
                arrays++;
                item.forEach(element => traverse(element));
            } else if (item !== null && typeof item === 'object') {
                objects++;
                const itemKeys = Object.keys(item);
                keys += itemKeys.length;
                itemKeys.forEach(key => traverse(item[key]));
            }
        }
        
        traverse(obj);
        return { objects, arrays, keys };
    }
    
    // Format bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // Show error
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
        hideSuccess();
    }
    
    // Hide error
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    // Show success
    function showSuccess(message) {
        successText.textContent = message;
        successMessage.style.display = 'block';
        hideError();
    }
    
    // Hide success
    function hideSuccess() {
        successMessage.style.display = 'none';
    }
    
    // Show notification
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
    
    // Auto-format on paste (optional)
    jsonInput.addEventListener('paste', function() {
        setTimeout(() => {
            const input = jsonInput.value.trim();
            if (input) {
                try {
                    JSON.parse(input);
                    // Valid JSON, auto-format after a delay
                    setTimeout(() => formatBtn.click(), 500);
                } catch (e) {
                    // Invalid JSON, do nothing
                }
            }
        }, 100);
    });
});

