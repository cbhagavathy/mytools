document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const codeInput = document.getElementById('codeInput');
    const codeOutput = document.getElementById('codeOutput');
    const codeOutputCode = document.getElementById('codeOutputCode');
    
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const fullscreenCopyBtn = document.getElementById('fullscreenCopyBtn');
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    const fullscreenCode = document.getElementById('fullscreenCode');
    
    const braceStyle = document.getElementById('braceStyle');
    const indentSize = document.getElementById('indentSize');
    const addSpaces = document.getElementById('addSpaces');
    
    const outputFooter = document.getElementById('outputFooter');
    const outputMessage = document.getElementById('outputMessage');
    
    const lineCount = document.getElementById('lineCount');
    const charCount = document.getElementById('charCount');
    const functionCount = document.getElementById('functionCount');
    const braceCount = document.getElementById('braceCount');
    const commentCount = document.getElementById('commentCount');
    const includeCount = document.getElementById('includeCount');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    // Format button click
    formatBtn.addEventListener('click', function() {
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter C code', 'warning');
            return;
        }
        
        const formatted = formatCode(code);
        codeOutput.value = formatted;
        codeOutputCode.textContent = formatted;
        
        // Apply syntax highlighting
        Prism.highlightElement(codeOutputCode);
        
        updateStatistics(formatted);
        outputFooter.style.display = 'block';
        outputMessage.textContent = 'Code formatted successfully';
        showNotification('Code formatted successfully!', 'success');
    });
    
    // Minify button click
    minifyBtn.addEventListener('click', function() {
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter C code', 'warning');
            return;
        }
        
        const minified = minifyCode(code);
        codeOutput.value = minified;
        codeOutputCode.textContent = minified;
        
        Prism.highlightElement(codeOutputCode);
        
        updateStatistics(minified);
        outputFooter.style.display = 'block';
        outputMessage.textContent = 'Code minified successfully';
        showNotification('Code minified successfully!', 'success');
    });
    
    // Clear button click
    clearBtn.addEventListener('click', function() {
        codeInput.value = '';
        codeOutput.value = '';
        codeOutputCode.textContent = '// Formatted code will appear here...';
        outputFooter.style.display = 'none';
        updateStatistics('');
        showNotification('Cleared', 'info');
    });
    
    // Copy button click
    copyBtn.addEventListener('click', async function() {
        const code = codeOutput.value;
        
        if (!code) {
            showNotification('No formatted code to copy', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(code);
            showNotification('Formatted code copied to clipboard!', 'success');
        } catch (err) {
            showNotification('Failed to copy code', 'error');
        }
    });
    
    // Format Code function
    function formatCode(code) {
        const indent = indentSize.value === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize.value));
        const style = braceStyle.value;
        const spaces = addSpaces.checked;
        
        // Remove extra whitespace
        code = code.replace(/\s+/g, ' ').trim();
        
        // Add spaces around operators if enabled
        if (spaces) {
            code = code
                .replace(/([=+\-*/<>!&|%^]+)/g, ' $1 ')
                .replace(/\s+/g, ' ')
                .replace(/\(\s+/g, '(')
                .replace(/\s+\)/g, ')')
                .replace(/\s+,/g, ',')
                .replace(/,(?!\s)/g, ', ');
        }
        
        // Add newlines for major structures
        code = code
            .replace(/;/g, ';\n')
            .replace(/{/g, '{\n')
            .replace(/}/g, '\n}\n')
            .replace(/#include/g, '\n#include')
            .replace(/#define/g, '\n#define');
        
        // Apply brace style
        switch(style) {
            case 'allman':
                // Braces on new line
                code = code.replace(/([^;\s])\s*{/g, '$1\n{');
                break;
            case 'gnu':
                // Braces on new line with extra indent
                code = code.replace(/([^;\s])\s*{/g, '$1\n  {');
                break;
            case 'whitesmiths':
                // Braces and content indented
                code = code.replace(/([^;\s])\s*{/g, '$1\n  {');
                break;
            case 'kr':
            default:
                // Opening brace on same line
                code = code.replace(/\n\s*{/g, ' {');
                break;
        }
        
        // Clean up multiple blank lines
        code = code.replace(/\n{3,}/g, '\n\n');
        
        // Apply indentation
        const lines = code.split('\n');
        let indentLevel = 0;
        const formattedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (!line) {
                formattedLines.push('');
                continue;
            }
            
            // Decrease indent for closing braces
            if (line.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            // Special handling for preprocessor directives
            if (line.startsWith('#')) {
                formattedLines.push(line);
                continue;
            }
            
            // Apply indentation
            formattedLines.push(indent.repeat(indentLevel) + line);
            
            // Increase indent after opening brace
            if (line.includes('{') && !line.includes('}')) {
                indentLevel++;
            }
            
            // Handle braces on same line
            if (line.includes('{') && line.includes('}')) {
                // No change in indent level
            } else if (line.includes('}') && line.includes('{')) {
                // Closing and opening on same line
                indentLevel++;
            }
        }
        
        // Clean up result
        let formatted = formattedLines.join('\n');
        formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();
        
        return formatted;
    }
    
    // Minify Code function
    function minifyCode(code) {
        // Remove comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');
        code = code.replace(/\/\/.*/g, '');
        
        // Remove extra whitespace
        code = code
            .replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*;\s*/g, ';')
            .replace(/\s*,\s*/g, ',')
            .replace(/\s*\(\s*/g, '(')
            .replace(/\s*\)\s*/g, ')')
            .trim();
        
        return code;
    }
    
    // Update statistics
    function updateStatistics(code) {
        if (!code) {
            lineCount.textContent = '0';
            charCount.textContent = '0';
            functionCount.textContent = '0';
            braceCount.textContent = '0';
            commentCount.textContent = '0';
            includeCount.textContent = '0';
            return;
        }
        
        // Line count
        const lines = code.split('\n').length;
        lineCount.textContent = lines.toLocaleString();
        
        // Character count
        charCount.textContent = code.length.toLocaleString();
        
        // Function count (rough estimate)
        const functions = (code.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;
        functionCount.textContent = functions.toLocaleString();
        
        // Brace count
        const openBraces = (code.match(/{/g) || []).length;
        const closeBraces = (code.match(/}/g) || []).length;
        braceCount.textContent = `${openBraces}/${closeBraces}`;
        
        // Comment count
        const lineComments = (code.match(/\/\/.*/g) || []).length;
        const blockComments = (code.match(/\/\*[\s\S]*?\*\//g) || []).length;
        commentCount.textContent = (lineComments + blockComments).toLocaleString();
        
        // Include count
        const includes = (code.match(/#include/g) || []).length;
        includeCount.textContent = includes.toLocaleString();
    }
    
    // Show notification
    function showNotification(message, type) {
        toastMessage.textContent = message;
        
        const toastEl = document.getElementById('notificationToast');
        const toastHeader = toastEl.querySelector('.toast-header');
        const icon = toastHeader.querySelector('i');
        
        icon.className = 'me-2';
        
        if (type === 'success') {
            icon.classList.add('bi', 'bi-check-circle-fill', 'text-success');
        } else if (type === 'error') {
            icon.classList.add('bi', 'bi-x-circle-fill', 'text-danger');
        } else if (type === 'warning') {
            icon.classList.add('bi', 'bi-exclamation-triangle-fill', 'text-warning');
        } else {
            icon.classList.add('bi', 'bi-info-circle-fill', 'text-info');
        }
        
        toast.show();
    }
    
    // Keyboard shortcuts
    codeInput.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to format
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            formatBtn.click();
        }
        
        // Tab key inserts spaces/tab
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const indent = indentSize.value === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize.value));
            
            this.value = this.value.substring(0, start) + indent + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + indent.length;
        }
    });
    
    // Fullscreen button click
    fullscreenBtn.addEventListener('click', function() {
        const code = codeOutput.value;
        
        if (!code) {
            showNotification('No formatted code to view', 'warning');
            return;
        }
        
        // Copy code to fullscreen view
        fullscreenCode.textContent = code;
        Prism.highlightElement(fullscreenCode);
        
        // Show fullscreen
        fullscreenContainer.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Exit fullscreen button
    exitFullscreenBtn.addEventListener('click', exitFullscreen);
    
    // Fullscreen copy button
    fullscreenCopyBtn.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(fullscreenCode.textContent);
            showNotification('Code copied to clipboard!', 'success');
        } catch (err) {
            showNotification('Failed to copy code', 'error');
        }
    });
    
    // Exit fullscreen function
    function exitFullscreen() {
        fullscreenContainer.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // ESC key to exit fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && fullscreenContainer.classList.contains('active')) {
            exitFullscreen();
        }
    });
    
    // Click outside to exit fullscreen (optional)
    fullscreenContainer.addEventListener('click', function(e) {
        if (e.target === fullscreenContainer) {
            exitFullscreen();
        }
    });
    
    // Initialize statistics
    updateStatistics('');
});

