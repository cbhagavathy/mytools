// C Code Viewer JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const cCodeInput = document.getElementById('cCodeInput');
    const parseBtn = document.getElementById('parseBtn');
    const viewerContainer = document.getElementById('viewerContainer');
    const functionList = document.getElementById('functionList');
    const functionCount = document.getElementById('functionCount');
    const functionSearchInput = document.getElementById('functionSearchInput');
    const codeDisplay = document.getElementById('codeDisplay');
    const currentFunctionTitle = document.getElementById('currentFunctionTitle');
    const codeSearchInput = document.getElementById('codeSearchInput');
    const prevMatchBtn = document.getElementById('prevMatchBtn');
    const nextMatchBtn = document.getElementById('nextMatchBtn');
    const matchCount = document.getElementById('matchCount');
    const copyFunctionBtn = document.getElementById('copyFunctionBtn');
    const formatFunctionBtn = document.getElementById('formatFunctionBtn');
    const filePathDisplay = document.getElementById('filePathDisplay');
    const filePathText = document.getElementById('filePathText');
    
    // File upload elements
    const pasteTabBtn = document.getElementById('pasteTabBtn');
    const fileTabBtn = document.getElementById('fileTabBtn');
    const pasteSection = document.getElementById('pasteSection');
    const fileSection = document.getElementById('fileSection');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const clearFileBtn = document.getElementById('clearFileBtn');
    
    let allFunctions = [];
    let currentFunction = null;
    let currentMatches = [];
    let currentMatchIndex = -1;
    let currentFileContent = null;
    let currentFilePath = '';

    // Parse button click
    parseBtn.addEventListener('click', function() {
        const code = cCodeInput.value.trim();
        if (!code) {
            alert('Please paste some C code first!');
            return;
        }

        allFunctions = parseFunctions(code);
        
        if (allFunctions.length === 0) {
            alert('No functions found in the code!');
            return;
        }

        displayFunctionList(allFunctions);
        viewerContainer.style.display = 'flex';
        
        // Show file path if available
        if (currentFilePath) {
            filePathDisplay.style.display = 'flex';
            filePathText.textContent = currentFilePath;
        }
    });

    // Function search
    functionSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filtered = allFunctions.filter(func => 
            func.name.toLowerCase().includes(searchTerm)
        );
        displayFunctionList(filtered);
    });

    // Code search
    codeSearchInput.addEventListener('input', function() {
        if (!currentFunction) return;
        searchInCode(this.value);
    });

    // Search navigation
    prevMatchBtn.addEventListener('click', () => navigateMatch(-1));
    nextMatchBtn.addEventListener('click', () => navigateMatch(1));

    // Copy function
    copyFunctionBtn.addEventListener('click', function() {
        if (!currentFunction) {
            alert('No function selected to copy!');
            return;
        }
        
        navigator.clipboard.writeText(currentFunction.code).then(() => {
            // Visual feedback
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="bi bi-check"></i> Copied!';
            this.style.background = '#28a745';
            this.style.color = 'white';
            this.style.borderColor = '#28a745';
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = '';
                this.style.color = '';
                this.style.borderColor = '';
            }, 2000);
        }).catch(err => {
            alert('Failed to copy: ' + err);
        });
    });

    // Format function
    formatFunctionBtn.addEventListener('click', function() {
        if (!currentFunction) {
            alert('No function selected to format!');
            return;
        }
        
        // Simple C code formatting
        const formatted = formatCCode(currentFunction.code);
        currentFunction.code = formatted;
        displayFunction(currentFunction);
    });

    // Tab switching
    pasteTabBtn.addEventListener('click', function() {
        pasteTabBtn.classList.add('active');
        fileTabBtn.classList.remove('active');
        pasteSection.style.display = 'block';
        fileSection.style.display = 'none';
    });

    fileTabBtn.addEventListener('click', function() {
        fileTabBtn.classList.add('active');
        pasteTabBtn.classList.remove('active');
        fileSection.style.display = 'block';
        pasteSection.style.display = 'none';
    });

    // File upload - Browse button
    browseBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event from bubbling to parent
        fileInput.click();
    });

    // File upload - File input change
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // Drag and drop - Click on upload area (but not the button)
    fileUploadArea.addEventListener('click', function(e) {
        // Only trigger if not clicking the browse button
        if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Clear file
    clearFileBtn.addEventListener('click', function() {
        fileInput.value = '';
        currentFileContent = null;
        fileInfo.style.display = 'none';
        fileUploadArea.style.display = 'block';
        cCodeInput.value = '';
    });

    // Handle file upload
    function handleFile(file) {
        // Validate file type
        if (!file.name.endsWith('.c') && !file.name.endsWith('.h')) {
            alert('Please select a .c or .h file');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            currentFileContent = e.target.result;
            currentFilePath = file.webkitRelativePath || file.name;
            cCodeInput.value = currentFileContent;
            
            // Switch back to paste code view to show the content
            pasteTabBtn.classList.add('active');
            fileTabBtn.classList.remove('active');
            pasteSection.style.display = 'block';
            fileSection.style.display = 'none';
            
            // Reset file upload UI
            fileInput.value = '';
            fileInfo.style.display = 'none';
            fileUploadArea.style.display = 'block';
            
            // Show success message with file details
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success mt-3';
            successMsg.style.padding = '15px 20px';
            successMsg.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="bi bi-check-circle-fill" style="font-size: 1.2rem;"></i>
                        <span style="font-weight: 600; font-size: 1.05rem;">File loaded successfully!</span>
                    </div>
                    <div style="margin-left: 32px; display: flex; flex-direction: column; gap: 3px; font-size: 0.9rem;">
                        <div><strong>File:</strong> ${file.name}</div>
                        <div><strong>Size:</strong> ${formatFileSize(file.size)}</div>
                        <div><strong>Type:</strong> ${file.type || 'C Source File'}</div>
                        <div style="font-family: 'Consolas', monospace; color: #666; font-size: 0.85rem; margin-top: 2px;">
                            <strong>Path:</strong> ${file.webkitRelativePath || file.name}
                        </div>
                    </div>
                </div>
            `;
            
            const inputSection = document.querySelector('.input-section');
            const existingAlert = inputSection.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            inputSection.insertBefore(successMsg, parseBtn);
            
            // Auto-remove success message after 5 seconds
            setTimeout(() => {
                successMsg.remove();
            }, 5000);
        };

        reader.onerror = function() {
            alert('Error reading file!');
        };

        reader.readAsText(file);
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Parse C code to extract functions
    function parseFunctions(code) {
        const functions = [];
        const lines = code.split('\n');
        
        // Enhanced regex to match function name with optional modifiers
        // Matches: [PIN_EXPORT] [static] [inline] [extern] [const] return_type [*] function_name(
        // We'll find the closing ) and then the opening brace separately
        const functionRegex = /^(?:PIN_EXPORT\s+)?(?:static\s+)?(?:inline\s+)?(?:extern\s+)?(?:const\s+)?(?:unsigned\s+)?(?:signed\s+)?(\w+(?:\s*\*+)?)\s+(\w+)\s*\(/gm;
        
        let match;
        functionRegex.lastIndex = 0;
        
        while ((match = functionRegex.exec(code)) !== null) {
            const functionName = match[2];
            const startPos = match.index;
            
            // Find the closing parenthesis for parameters (may span multiple lines)
            const closingParenPos = findMatchingParen(code, match.index + match[0].length - 1);
            if (closingParenPos === -1) {
                continue;
            }
            
            // Check if this is a forward declaration (ends with semicolon before any brace)
            const afterParen = code.substring(closingParenPos + 1);
            const nextChars = afterParen.substring(0, 100).trim();
            
            // Skip if it's a forward declaration (semicolon before brace)
            if (nextChars[0] === ';') {
                continue;
            }
            
            // Look for the opening brace after the closing parenthesis
            const bracePos = findOpeningBrace(code, closingParenPos + 1);
            if (bracePos === -1) {
                continue; // No opening brace found, skip this match
            }
            
            const startLine = code.substring(0, startPos).split('\n').length;
            
            // Extract the full function including the signature and body
            const functionBody = extractFunctionBody(code, startPos, bracePos);
            
            if (functionBody) {
                const endLine = startLine + functionBody.split('\n').length - 1;
                
                functions.push({
                    name: functionName,
                    startLine: startLine,
                    endLine: endLine,
                    code: functionBody,
                    fullMatch: match[0]
                });
            }
        }
        
        return functions;
    }
    
    // Find matching closing parenthesis
    function findMatchingParen(code, startPos) {
        let depth = 1; // Start with 1 since we're already at the opening paren
        
        for (let i = startPos + 1; i < code.length; i++) {
            const char = code[i];
            if (char === '(') {
                depth++;
            } else if (char === ')') {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        return -1;
    }
    
    // Find the opening brace after a function signature
    function findOpeningBrace(code, startPos) {
        for (let i = startPos; i < code.length; i++) {
            const char = code[i];
            if (char === '{') {
                return i;
            } else if (char === ';') {
                return -1; // Found semicolon before brace, it's a declaration
            }
            // Skip whitespace and newlines
        }
        return -1;
    }

    // Extract complete function body including braces
    function extractFunctionBody(code, startPos, bracePos) {
        let braceCount = 0;
        let functionCode = '';
        
        // Extract from function start to the opening brace
        functionCode = code.substring(startPos, bracePos + 1);
        
        // Now find the matching closing brace
        braceCount = 1; // We already have the opening brace
        
        for (let i = bracePos + 1; i < code.length; i++) {
            const char = code[i];
            functionCode += char;
            
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    return functionCode;
                }
            }
        }
        
        return functionCode;
    }

    // Display function list
    function displayFunctionList(functions) {
        functionCount.textContent = `${functions.length} function${functions.length !== 1 ? 's' : ''} found`;
        
        functionList.innerHTML = functions.map(func => `
            <div class="function-item" data-function="${func.name}">
                <div class="function-name">${escapeHtml(func.name)}(...)</div>
                <div class="function-line-info">Lines ${func.startLine} - ${func.endLine}</div>
            </div>
        `).join('');
        
        // Add click handlers
        document.querySelectorAll('.function-item').forEach(item => {
            item.addEventListener('click', function() {
                const functionName = this.getAttribute('data-function');
                const func = functions.find(f => f.name === functionName);
                if (func) {
                    displayFunction(func);
                    
                    // Update active state
                    document.querySelectorAll('.function-item').forEach(i => i.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
    }

    // Display selected function
    function displayFunction(func) {
        currentFunction = func;
        currentFunctionTitle.textContent = `${func.name}() - Lines ${func.startLine}-${func.endLine}`;
        
        // Split code into lines BEFORE highlighting to preserve line structure
        const codeLines = func.code.split('\n');
        
        // Process each line individually with Prism to prevent line merging
        const linesHtml = codeLines.map((line, index) => {
            const lineNumber = func.startLine + index;
            // Highlight each line individually - use space for empty lines
            const highlightedLine = line ? Prism.highlight(line, Prism.languages.c, 'c') : ' ';
            return `<span class="code-line" data-line="${lineNumber}">${highlightedLine}</span>`;
        }).join('\n');
        
        codeDisplay.innerHTML = `<pre><code class="language-c">${linesHtml}</code></pre>`;
        
        // Reset search
        codeSearchInput.value = '';
        currentMatches = [];
        currentMatchIndex = -1;
        matchCount.style.display = 'none';
    }

    // Search within displayed code
    function searchInCode(searchTerm) {
        console.log('Search called with term:', searchTerm);
        
        if (!currentFunction) {
            console.log('No current function selected');
            clearSearch();
            return;
        }
        
        if (!searchTerm) {
            clearSearch();
            return;
        }
        
        // Clear previous highlights
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('highlight-match', 'current-match');
        });
        
        currentMatches = [];
        const searchLower = searchTerm.toLowerCase().trim();
        
        console.log('Searching for:', searchLower);
        
        // Find all matching lines by checking text content (works with Prism highlighting)
        const allLines = document.querySelectorAll('.code-line');
        console.log('Total lines:', allLines.length);
        
        allLines.forEach((line, index) => {
            // Get the text content (this extracts text from all nested spans created by Prism)
            const lineText = line.textContent.toLowerCase();
            
            if (lineText.includes(searchLower)) {
                line.classList.add('highlight-match');
                currentMatches.push({ 
                    element: line, 
                    index: index,
                    text: line.textContent 
                });
            }
        });
        
        console.log('Matches found:', currentMatches.length);
        
        if (currentMatches.length > 0) {
            currentMatchIndex = 0;
            highlightCurrentMatch();
            matchCount.style.display = 'inline-block';
            matchCount.textContent = `${currentMatchIndex + 1}/${currentMatches.length}`;
        } else {
            matchCount.style.display = 'inline-block';
            matchCount.textContent = '0/0';
        }
    }

    // Navigate through search matches
    function navigateMatch(direction) {
        if (currentMatches.length === 0) return;
        
        currentMatchIndex += direction;
        
        // Wrap around
        if (currentMatchIndex < 0) {
            currentMatchIndex = currentMatches.length - 1;
        } else if (currentMatchIndex >= currentMatches.length) {
            currentMatchIndex = 0;
        }
        
        highlightCurrentMatch();
        matchCount.textContent = `${currentMatchIndex + 1}/${currentMatches.length}`;
    }

    // Highlight current match and scroll to it
    function highlightCurrentMatch() {
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('current-match');
        });
        
        const currentMatch = currentMatches[currentMatchIndex];
        if (currentMatch) {
            currentMatch.element.classList.add('current-match');
            currentMatch.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Clear search highlights
    function clearSearch() {
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('highlight-match', 'current-match');
        });
        currentMatches = [];
        currentMatchIndex = -1;
        matchCount.style.display = 'none';
    }

    // Simple C code formatter
    function formatCCode(code) {
        // Step 1: Join multi-line statements into single lines
        const joinedCode = joinMultiLineStatements(code);
        
        // Step 2: Apply proper indentation
        let indentLevel = 0;
        const indentSize = 4;
        const lines = joinedCode.split('\n');
        const formattedLines = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Skip empty lines
            if (!trimmed) {
                formattedLines.push('');
                return;
            }
            
            // Decrease indent for closing braces
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            // Add indentation
            const indent = '\t'.repeat(indentLevel);
            formattedLines.push(indent + trimmed);
            
            // Increase indent for opening braces
            if (trimmed.endsWith('{')) {
                indentLevel++;
            }
            
            // Handle special cases for closing braces followed by other code
            const braceMatches = trimmed.match(/}/g);
            const openBraceMatches = trimmed.match(/{/g);
            if (braceMatches && openBraceMatches) {
                const netChange = openBraceMatches.length - braceMatches.length;
                // Already handled above
            }
        });
        
        return formattedLines.join('\n');
    }
    
    // Join multi-line statements into single lines
    function joinMultiLineStatements(code) {
        const lines = code.split('\n');
        const joinedLines = [];
        let currentLine = '';
        let inMultiLineStatement = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Skip empty lines when not in multi-line statement
            if (!trimmed && !inMultiLineStatement) {
                if (currentLine) {
                    joinedLines.push(currentLine);
                    currentLine = '';
                }
                joinedLines.push('');
                continue;
            }
            
            // Start of a new statement
            if (!inMultiLineStatement) {
                currentLine = trimmed;
            } else {
                // Continuation of previous line - join with space
                currentLine += ' ' + trimmed;
            }
            
            // Check if this line completes a statement
            // A statement is complete if it ends with:
            // - semicolon (;)
            // - opening brace ({)
            // - closing brace (})
            // - single-line comment after any of the above
            const endsStatement = /[;{}]\s*(?:\/\/.*)?$/.test(trimmed);
            
            // Check if line is a preprocessor directive
            const isPreprocessor = /^#/.test(trimmed);
            
            // Check if line is a comment
            const isComment = /^\/\//.test(trimmed) || /^\/\*/.test(trimmed);
            
            if (endsStatement || isPreprocessor || isComment) {
                // Statement is complete
                joinedLines.push(currentLine);
                currentLine = '';
                inMultiLineStatement = false;
            } else {
                // Statement continues on next line
                inMultiLineStatement = true;
            }
        }
        
        // Add any remaining line
        if (currentLine) {
            joinedLines.push(currentLine);
        }
        
        return joinedLines.join('\n');
    }

    // Utility function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

