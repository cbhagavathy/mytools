document.addEventListener('DOMContentLoaded', function() {
    console.clear();
    console.log('%c════════════════════════════════════════════════', 'color: blue; font-weight: bold;');
    console.log('%c🔧 C Loop Analyzer v2.1 - DEBUG VERSION LOADED!', 'color: green; font-weight: bold; font-size: 16px;');
    console.log('%c════════════════════════════════════════════════', 'color: blue; font-weight: bold;');
    console.log('✅ Nested parentheses support');
    console.log('✅ PIN/pbo/INTU/C-stdlib exclusions');
    console.log('✅ Special tracking for: fm_intu_ws_build_client_list_detail');
    console.log('✅ Special tracking for: fm_intu_utils_allow_0dollar_charge_info_in_corres');
    console.log('%c════════════════════════════════════════════════', 'color: blue; font-weight: bold;');
    
    // DOM Elements
    const codeInput = document.getElementById('codeInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    const resultsContainer = document.getElementById('resultsContainer');
    const functionsWithLoops = document.getElementById('functionsWithLoops');
    const totalLoops = document.getElementById('totalLoops');
    const functionsInLoops = document.getElementById('functionsInLoops');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    const fullscreenContent = document.getElementById('fullscreenContent');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const exportBtnFullscreen = document.getElementById('exportBtnFullscreen');
    
    let analysisData = null;
    
    // Analyze button click
    analyzeBtn.addEventListener('click', function() {
        console.log('\n\n');
        console.log('%c╔═══════════════════════════════════════════════════════════════╗', 'color: cyan; font-weight: bold;');
        console.log('%c║           STARTING NEW ANALYSIS                               ║', 'color: cyan; font-weight: bold;');
        console.log('%c╚═══════════════════════════════════════════════════════════════╝', 'color: cyan; font-weight: bold;');
        
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter C code', 'warning');
            return;
        }
        
        console.log(`Code length: ${code.length} characters`);
        
        // Check if target function is in the code
        const hasTargetFunc = code.includes('fm_intu_ws_build_client_list_detail');
        const hasTargetCall = code.includes('fm_intu_utils_allow_0dollar_charge_info_in_corres');
        
        console.log(`Contains 'fm_intu_ws_build_client_list_detail': ${hasTargetFunc}`);
        console.log(`Contains 'fm_intu_utils_allow_0dollar_charge_info_in_corres': ${hasTargetCall}`);
        
        if (!hasTargetFunc) {
            console.log('%c⚠️ WARNING: Target function NOT in code!', 'color: orange; font-size: 14px; font-weight: bold;');
        }
        if (!hasTargetCall) {
            console.log('%c⚠️ WARNING: Target function call NOT in code!', 'color: orange; font-size: 14px; font-weight: bold;');
        }
        
        try {
            const analysis = analyzeLoops(code);
            analysisData = analysis;
            
            displayResults(analysis);
            updateStatistics(analysis);
            
            showNotification('Analysis completed successfully!', 'success');
        } catch (error) {
            showNotification('Error analyzing code: ' + error.message, 'error');
            console.error(error);
        }
    });
    
    // Clear button click
    clearBtn.addEventListener('click', function() {
        codeInput.value = '';
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="bi bi-arrow-repeat"></i>
                <h5>No analysis performed yet</h5>
                <p>Enter C code and click "Analyze Loops"</p>
            </div>
        `;
        
        analysisData = null;
        fullscreenBtn.disabled = true;
        exportBtn.disabled = true;
        
        functionsWithLoops.textContent = '0';
        totalLoops.textContent = '0';
        functionsInLoops.textContent = '0';
        
        showNotification('Cleared', 'info');
    });
    
    // Export button click
    exportBtn.addEventListener('click', function() {
        if (!analysisData) {
            showNotification('No analysis data to export', 'warning');
            return;
        }
        
        const report = generateReport(analysisData);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'c_loop_analysis_report.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Report exported successfully!', 'success');
    });
    
    // Fullscreen button click
    fullscreenBtn.addEventListener('click', function() {
        enterFullscreen();
    });
    
    // Exit fullscreen button click
    exitFullscreenBtn.addEventListener('click', function() {
        exitFullscreen();
    });
    
    // Expand all boxes
    expandAllBtn.addEventListener('click', function() {
        toggleAllBoxes(false);
    });
    
    // Collapse all boxes
    collapseAllBtn.addEventListener('click', function() {
        toggleAllBoxes(true);
    });
    
    // Export button in fullscreen
    exportBtnFullscreen.addEventListener('click', function() {
        if (!analysisData) {
            showNotification('No analysis data to export', 'warning');
            return;
        }
        
        const report = generateReport(analysisData);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'c_loop_analysis_report.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Report exported successfully!', 'success');
    });
    
    // ESC key to exit fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && fullscreenContainer.classList.contains('active')) {
            exitFullscreen();
        }
    });
    
    // Enter fullscreen mode
    function enterFullscreen() {
        const content = resultsContainer.innerHTML;
        fullscreenContent.innerHTML = content;
        fullscreenContainer.classList.add('active');
        attachCollapseHandlers(fullscreenContent);
    }
    
    // Exit fullscreen mode
    function exitFullscreen() {
        fullscreenContainer.classList.remove('active');
    }
    
    // Toggle all boxes
    function toggleAllBoxes(collapse) {
        const container = fullscreenContainer.classList.contains('active') ? fullscreenContent : resultsContainer;
        const headers = container.querySelectorAll('.function-header');
        
        headers.forEach(header => {
            const icon = header.querySelector('.collapse-icon');
            const loopContainer = header.closest('.function-box').querySelector('.loop-container');
            
            if (icon && loopContainer) {
                if (collapse) {
                    icon.classList.add('collapsed');
                    loopContainer.classList.add('collapsed');
                } else {
                    icon.classList.remove('collapsed');
                    loopContainer.classList.remove('collapsed');
                }
            }
        });
    }
    
    // Attach collapse handlers to function headers
    function attachCollapseHandlers(container) {
        const headers = container.querySelectorAll('.function-header');
        
        headers.forEach(header => {
            header.addEventListener('click', function(e) {
                // Don't collapse if clicking on a badge or other interactive element
                if (e.target.classList.contains('badge')) return;
                
                const icon = this.querySelector('.collapse-icon');
                const loopContainer = this.closest('.function-box').querySelector('.loop-container');
                
                if (icon && loopContainer) {
                    icon.classList.toggle('collapsed');
                    loopContainer.classList.toggle('collapsed');
                }
            });
        });
    }
    
    // Analyze loops in code
    function analyzeLoops(code) {
        // Save original for debugging
        const originalCode = code;
        
        // Remove multi-line comments first
        code = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
        // Remove single-line comments but keep newlines
        code = code.replace(/\/\/.*$/gm, '');
        
        const functions = [];
        const processedFunctions = new Set(); // Track to avoid duplicates
        
        console.log('=== Starting Analysis ===');
        console.log('Code length:', code.length);
        console.log('Original code length:', originalCode.length);
        
        // More robust pattern to catch function definitions including multi-line
        // Matches: [modifiers] type *func(...) { where params can be multi-line
        // Use [\s\S] to match any character including newlines, \s* allows brace on new line
        // Negative lookahead to skip function prototypes (ending with ;)
        const functionRegex = /(\w+(?:\s+\w+)*\s*\*?\*?)\s+(\*?\*?\w+)\s*\([\s\S]*?\)\s*(?!;)\s*\{/g;
        let match;
        
        let functionCount = 0;
        let matchedFunctions = 0;
        
        while ((match = functionRegex.exec(code)) !== null) {
            matchedFunctions++;
            
            const fullMatch = match[0];
            const returnTypePart = match[1].trim();
            const functionName = match[2].trim().replace(/^\*+/, ''); // Remove leading * if any
            
            // Skip control flow statements and false positives
            const controlFlowKeywords = ['if', 'while', 'for', 'switch', 'do', 'else', 'return', 'no', 'select'];
            if (controlFlowKeywords.includes(functionName.toLowerCase()) || 
                returnTypePart.toLowerCase().includes('else')) {
                continue;
            }
            
            // Extract clean return type (last word or two words for things like "unsigned int")
            const returnTypeParts = returnTypePart.split(/\s+/);
            const returnType = returnTypeParts.slice(-2).join(' ');
            
            // Skip if we've already processed this function
            if (processedFunctions.has(functionName)) {
                console.log(`   ⚠️ Skipping duplicate: ${functionName}`);
                continue;
            }
            
            processedFunctions.add(functionName);
            functionCount++;
            
            // Special tracking for specific functions
            const isTargetFunction = functionName === 'fm_intu_ws_build_client_list_detail' || 
                                     functionName === 'fm_intu_utils_format_event_to_charge_details';
            
            if (isTargetFunction) {
                console.log(`\n⭐⭐⭐ TARGET FUNCTION FOUND: ${functionName} ⭐⭐⭐`);
            }
            
            console.log(`   Function: ${returnType} ${functionName}()`);
            console.log(`   Position: ${match.index}`);
            
            // Extract function body
            const startIdx = match.index + match[0].length;
            let braceCount = 1;
            let endIdx = startIdx;
            
            for (let i = startIdx; i < code.length && braceCount > 0; i++) {
                if (code[i] === '{') braceCount++;
                if (code[i] === '}') braceCount--;
                if (braceCount === 0) {
                    endIdx = i;
                    break;
                }
                endIdx = i;
            }
            
            const functionBody = code.substring(startIdx, endIdx);
            console.log(`   Body length: ${functionBody.length} chars`);
            
            if (isTargetFunction) {
                // Extra debugging for target function
                console.log(`   🔍 Checking for loops...`);
            }
            
            // Find loops in function body
            const loops = findLoops(functionBody);
            
            console.log(`   Top-level loops found: ${loops.length}`);
            
            if (isTargetFunction && loops.length > 0) {
                console.log(`   🔍 Loop structure:`, JSON.stringify(loops, null, 2));
            }
            
            if (loops.length > 0) {
                const hasCalls = hasAnyFunctionCalls(loops);
                console.log(`   Has any function calls in loops: ${hasCalls}`);
                
                // Log which calls were found
                if (hasCalls) {
                    const allCalls = [];
                    collectAllCalls(loops, allCalls);
                    console.log(`   Called functions: ${allCalls.join(', ')}`);
                }
                
                if (hasCalls) {
                    console.log(`   ✅ INCLUDED in results`);
                    functions.push({
                        name: functionName,
                        returnType: returnType,
                        loops: loops
                    });
                } else {
                    console.log(`   ❌ Excluded: has loops but no function calls`);
                    if (isTargetFunction) {
                        console.log(`   ⚠️ TARGET FUNCTION EXCLUDED! This needs investigation!`);
                    }
                }
            } else {
                console.log(`   ❌ Excluded: no loops found`);
                if (isTargetFunction) {
                    console.log(`   ⚠️ TARGET FUNCTION HAS NO LOOPS DETECTED!`);
                    // Show first 500 chars of body
                    console.log(`   Body preview: ${functionBody.substring(0, 500)}`);
                }
            }
        }
        
        console.log(`\n=== Analysis Complete ===`);
        console.log(`Total function definitions matched: ${matchedFunctions}`);
        console.log(`Unique functions analyzed: ${functionCount}`);
        console.log(`Functions with loops + calls: ${functions.length}`);
        
        // Check if target function was even found
        if (!processedFunctions.has('fm_intu_ws_build_client_list_detail')) {
            console.log(`\n❌❌❌ TARGET FUNCTION 'fm_intu_ws_build_client_list_detail' WAS NEVER MATCHED! ❌❌❌`);
            console.log(`This means the regex didn't find it. Checking code...`);
            
            // Try to find it manually
            const targetIndex = code.indexOf('fm_intu_ws_build_client_list_detail');
            if (targetIndex >= 0) {
                console.log(`Found function name at position ${targetIndex}`);
                console.log(`Context around it:`);
                console.log(code.substring(Math.max(0, targetIndex - 100), targetIndex + 200));
            } else {
                console.log(`Function name not found in code at all!`);
            }
        } else {
            console.log(`✅ TARGET FUNCTION was analyzed`);
            const isIncluded = functions.some(f => f.name === 'fm_intu_ws_build_client_list_detail');
            if (!isIncluded) {
                console.log(`⚠️ But it was EXCLUDED from results (no loops with function calls)`);
            } else {
                console.log(`✅ And it IS in the results!`);
            }
        }
        
        console.log('========================\n');
        
        // Helper to collect all function calls
        function collectAllCalls(loops, callsArray) {
            loops.forEach(loop => {
                if (loop.calledFunctions) {
                    callsArray.push(...loop.calledFunctions);
                }
                if (loop.nestedLoops) {
                    collectAllCalls(loop.nestedLoops, callsArray);
                }
            });
        }
        
        return functions;
    }
    
    // Find loops and called functions within them (with nesting)
    function findLoops(functionBody) {
        return parseNestedLoops(functionBody, 0);
    }
    
    // Check recursively if any loop has function calls
    function hasAnyFunctionCalls(loops) {
        for (const loop of loops) {
            // Check if this loop has direct function calls
            if (loop.calledFunctions && loop.calledFunctions.length > 0) {
                return true;
            }
            // Check nested loops recursively
            if (loop.nestedLoops && loop.nestedLoops.length > 0) {
                if (hasAnyFunctionCalls(loop.nestedLoops)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Helper to find matching closing parenthesis
    function findMatchingParen(code, startPos) {
        // startPos should be at the opening '('
        // Skip the opening paren and start counting from the next character
        let depth = 1;
        for (let i = startPos + 1; i < code.length; i++) {
            if (code[i] === '(') depth++;
            else if (code[i] === ')') depth--;
            if (depth === 0) return i;
        }
        return -1;
    }
    
    // Parse nested loops recursively
    function parseNestedLoops(code, startOffset) {
        const loops = [];
        let pos = 0;
        
        while (pos < code.length) {
            // Find loop keywords
            const remainingCode = code.substring(pos);
            const forIndex = remainingCode.search(/\bfor\s*\(/);
            const whileIndex = remainingCode.search(/\bwhile\s*\(/);
            const doIndex = remainingCode.search(/\bdo\s*\{/);
            
            // Determine which loop comes first
            let nextPos = -1;
            let loopType = null;
            
            if (forIndex >= 0 && (nextPos === -1 || forIndex < nextPos)) {
                nextPos = forIndex;
                loopType = 'for';
            }
            
            if (whileIndex >= 0 && (nextPos === -1 || whileIndex < nextPos)) {
                nextPos = whileIndex;
                loopType = 'while';
            }
            
            if (doIndex >= 0 && (nextPos === -1 || doIndex < nextPos)) {
                nextPos = doIndex;
                loopType = 'do-while';
            }
            
            if (nextPos === -1) break; // No more loops
            
            // Absolute position in the original code
            const absoluteLoopStart = pos + nextPos;
            pos += nextPos;
            
            let condition = '';
            let loopBodyStart = -1;
            
            if (loopType === 'do-while') {
                // For do-while, opening brace is right after 'do'
                const bracePos = code.indexOf('{', pos);
                if (bracePos === -1) break;
                loopBodyStart = bracePos + 1;
                
                // Extract body first, then find condition
                const loopBody = extractBlockBody(code, loopBodyStart);
                const afterDoBlock = code.substring(loopBodyStart + loopBody.length + 1);
                const condMatch = afterDoBlock.match(/\s*while\s*\(([^)]*)\)/);
                condition = condMatch ? condMatch[1].trim() : 'unknown';
                
                // Process this loop
                const nestedLoops = parseNestedLoops(loopBody, 0);
                const directCalls = findDirectFunctionCalls(loopBody, nestedLoops);
                const hasAnyCalls = directCalls.length > 0 || 
                                   (nestedLoops.length > 0 && hasAnyFunctionCalls(nestedLoops));
                
                if (hasAnyCalls) {
                    loops.push({
                        type: loopType,
                        condition: condition,
                        calledFunctions: directCalls,
                        nestedLoops: nestedLoops
                    });
                }
                
                pos = loopBodyStart + loopBody.length + 1;
            } else {
                // For for/while loops, find matching paren to handle nested parens
                const parenStartPos = code.indexOf('(', pos);
                if (parenStartPos === -1) break;
                
                const parenEndPos = findMatchingParen(code, parenStartPos + 1);
                if (parenEndPos === -1) break;
                
                // Extract condition
                condition = code.substring(parenStartPos + 1, parenEndPos);
                
                // Find opening brace after the condition
                const bracePos = code.indexOf('{', parenEndPos);
                if (bracePos === -1) break;
                loopBodyStart = bracePos + 1;
                
                // Extract loop body
                const loopBody = extractBlockBody(code, loopBodyStart);
                
                // Process this loop
                const nestedLoops = parseNestedLoops(loopBody, 0);
                const directCalls = findDirectFunctionCalls(loopBody, nestedLoops);
                const hasAnyCalls = directCalls.length > 0 || 
                                   (nestedLoops.length > 0 && hasAnyFunctionCalls(nestedLoops));
                
                if (hasAnyCalls) {
                    loops.push({
                        type: loopType,
                        condition: condition,
                        calledFunctions: directCalls,
                        nestedLoops: nestedLoops
                    });
                }
                
                pos = loopBodyStart + loopBody.length + 1;
            }
        }
        
        return loops;
    }
    
    // Find function calls that are directly in this block (not in nested loops)
    function findDirectFunctionCalls(codeBlock, nestedLoops) {
        // Remove nested loop bodies to avoid counting their calls
        let codeWithoutNestedLoops = codeBlock;
        
        if (nestedLoops && nestedLoops.length > 0) {
            nestedLoops.forEach(nestedLoop => {
                // Find and remove each nested loop entirely (including the loop keyword and its body)
                // This preserves function calls in if/else/switch statements that aren't in nested loops
                
                // Try to find the loop structure in the code
                let loopPattern;
                if (nestedLoop.type === 'for') {
                    loopPattern = new RegExp('for\\s*\\([^)]*' + escapeRegex(nestedLoop.condition) + '[^)]*\\)\\s*\\{', 'g');
                } else if (nestedLoop.type === 'while') {
                    loopPattern = new RegExp('while\\s*\\(' + escapeRegex(nestedLoop.condition) + '\\)\\s*\\{', 'g');
                } else if (nestedLoop.type === 'do') {
                    loopPattern = new RegExp('do\\s*\\{[\\s\\S]*?\\}\\s*while\\s*\\(' + escapeRegex(nestedLoop.condition) + '\\)', 'g');
                }
                
                if (loopPattern) {
                    const match = loopPattern.exec(codeWithoutNestedLoops);
                    if (match) {
                        const loopStart = match.index;
                        const bodyStart = codeWithoutNestedLoops.indexOf('{', loopStart) + 1;
                        
                        // Find matching closing brace
                        let braceCount = 1;
                        let bodyEnd = bodyStart;
                        for (let i = bodyStart; i < codeWithoutNestedLoops.length && braceCount > 0; i++) {
                            if (codeWithoutNestedLoops[i] === '{') braceCount++;
                            if (codeWithoutNestedLoops[i] === '}') braceCount--;
                            if (braceCount === 0) {
                                bodyEnd = i;
                                break;
                            }
                        }
                        
                        // Remove the entire loop structure
                        codeWithoutNestedLoops = codeWithoutNestedLoops.substring(0, loopStart) + 
                                                 ' '.repeat(bodyEnd - loopStart + 1) + 
                                                 codeWithoutNestedLoops.substring(bodyEnd + 1);
                    }
                }
            });
        }
        
        // Now find all function calls in the remaining code
        // This includes calls in if statements, switch statements, etc.
        const calls = findFunctionCalls(codeWithoutNestedLoops);
        
        // Debug: check for specific target function
        if (codeBlock.includes('fm_intu_utils_get_currency')) {
            console.log('🔍 Block contains fm_intu_utils_get_currency');
            console.log('   Found calls:', calls.map(c => c.name || c));
        }
        
        return calls;
    }
    
    // Helper to escape special regex characters
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Extract block body (between braces)
    function extractBlockBody(code, startIdx) {
        let braceCount = 1;
        let endIdx = startIdx;
        
        for (let i = startIdx; i < code.length && braceCount > 0; i++) {
            if (code[i] === '{') braceCount++;
            if (code[i] === '}') braceCount--;
            if (braceCount > 0) endIdx = i;
        }
        
        return code.substring(startIdx, endIdx + 1);
    }
    
    // Find function calls in code block
    // Returns array of objects: { name: 'funcName', fullCall: 'funcName(params)' }
    function findFunctionCalls(codeBlock) {
        const calls = [];
        const callRegex = /\b(\w+)\s*\(/g;
        let match;
        
        // Check if target function calls are in this block
        const hasTargetCall = codeBlock.includes('fm_intu_utils_allow_0dollar_charge_info_in_corres') ||
                              codeBlock.includes('fm_intu_utils_get_currency') ||
                              codeBlock.includes('PCM_OP');
        if (hasTargetCall) {
            console.log('🔍🔍🔍 FOUND TARGET FUNCTION CALL in code block!');
            console.log(`   Code block length: ${codeBlock.length} characters`);
            if (codeBlock.includes('fm_intu_utils_get_currency')) {
                console.log('   🎯 Specifically found: fm_intu_utils_get_currency');
                const idx = codeBlock.indexOf('fm_intu_utils_get_currency');
                console.log(`   Location: ${idx}, snippet: ${codeBlock.substring(idx, idx + 80)}`);
            }
            if (codeBlock.includes('fm_intu_utils_allow_0dollar_charge_info_in_corres')) {
                console.log('   🎯 Specifically found: fm_intu_utils_allow_0dollar_charge_info_in_corres');
            }
            if (codeBlock.includes('PCM_OP')) {
                console.log('   📋 Specifically found: PCM_OP macro');
                const idx = codeBlock.indexOf('PCM_OP');
                console.log(`   Location: ${idx}, snippet: ${codeBlock.substring(idx, idx + 100)}`);
            }
        }
        
        // Common C keywords and standard library functions to exclude
        const keywords = [
            // Control flow keywords
            'if', 'while', 'for', 'switch', 'sizeof', 'return', 'break', 'continue',
            
            // I/O functions
            'printf', 'scanf', 'fprintf', 'sprintf', 'snprintf', 'vprintf', 'vfprintf',
            'puts', 'fputs', 'gets', 'fgets', 'getchar', 'putchar', 'fputc', 'fgetc',
            'getc', 'putc', 'ungetc', 'perror',
            
            // File operations
            'fopen', 'fclose', 'fread', 'fwrite', 'fseek', 'ftell', 'rewind', 'feof',
            'ferror', 'clearerr', 'fflush', 'remove', 'rename', 'tmpfile', 'tmpnam',
            
            // String functions
            'strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp',
            'strchr', 'strrchr', 'strstr', 'strtok', 'strdup', 'strerror', 'strcoll',
            'strxfrm', 'strcspn', 'strspn', 'strpbrk', 'strtok_r',
            
            // Memory functions
            'malloc', 'calloc', 'realloc', 'free', 'memcpy', 'memmove', 'memset',
            'memcmp', 'memchr',
            
            // Character functions
            'isalpha', 'isdigit', 'isalnum', 'isspace', 'isupper', 'islower',
            'toupper', 'tolower', 'isprint', 'iscntrl', 'isxdigit', 'ispunct',
            
            // Math functions
            'abs', 'labs', 'fabs', 'ceil', 'floor', 'sqrt', 'pow', 'exp', 'log',
            'log10', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
            'sinh', 'cosh', 'tanh', 'fmod', 'modf', 'frexp', 'ldexp',
            
            // Conversion functions
            'atoi', 'atol', 'atof', 'strtol', 'strtoul', 'strtod', 'strtof',
            
            // Time functions
            'time', 'difftime', 'mktime', 'asctime', 'ctime', 'gmtime', 'localtime',
            'strftime', 'clock',
            
            // Utility functions
            'exit', 'abort', 'atexit', 'system', 'getenv', 'bsearch', 'qsort',
            'rand', 'srand', 'abs', 'div', 'ldiv',
            
            // POSIX functions
            'open', 'close', 'read', 'write', 'lseek', 'stat', 'fstat', 'access',
            'chmod', 'chown', 'mkdir', 'rmdir', 'opendir', 'closedir', 'readdir',
            'fork', 'exec', 'wait', 'waitpid', 'pipe', 'dup', 'dup2',
            
            // Network/Socket functions
            'socket', 'bind', 'listen', 'accept', 'connect', 'send', 'recv',
            'sendto', 'recvfrom', 'shutdown', 'getsockopt', 'setsockopt',
            
            // Signal functions
            'signal', 'raise', 'kill', 'alarm', 'pause',
            
            // Thread functions
            'pthread_create', 'pthread_join', 'pthread_exit', 'pthread_mutex_lock',
            'pthread_mutex_unlock', 'pthread_cond_wait', 'pthread_cond_signal'
        ];
        
        while ((match = callRegex.exec(codeBlock)) !== null) {
            const funcName = match[1];
            const startPos = match.index;
            
            const isTargetFunc = funcName === 'fm_intu_utils_allow_0dollar_charge_info_in_corres' ||
                                 funcName === 'fm_intu_utils_get_currency' ||
                                 funcName === 'PCM_OP';
            
            if (isTargetFunc) {
                console.log(`🎯 Found target function call: ${funcName}`);
            }
            
            // Special handling for PCM_OP - log it
            if (funcName === 'PCM_OP') {
                console.log(`📋 PCM_OP found at position ${startPos}`);
                console.log(`   Code snippet: ${codeBlock.substring(startPos, startPos + 100)}`);
            }
            
            // Skip keywords
            if (keywords.includes(funcName)) {
                if (isTargetFunc) console.log(`   ❌ Filtered by keywords`);
                continue;
            }
            
            // Skip PIN* macros (PIN_FLIST_*, PIN_ERR_*, etc.) - uppercase
            if (funcName.startsWith('PIN_')) {
                if (isTargetFunc) console.log(`   ❌ Filtered by PIN_ prefix`);
                continue;
            }
            
            // Skip pin_* functions - lowercase
            if (funcName.startsWith('pin_')) {
                if (isTargetFunc) console.log(`   ❌ Filtered by pin_ prefix (lowercase)`);
                continue;
            }
            
            // Skip pbo_* functions
            if (funcName.startsWith('pbo_')) {
                if (isTargetFunc) console.log(`   ❌ Filtered by pbo_ prefix`);
                continue;
            }
            
            // Skip INTU_* macros (commonly used in your codebase)
            if (funcName.startsWith('INTU_')) {
                if (isTargetFunc) console.log(`   ❌ Filtered by INTU_ prefix`);
                continue;
            }
            
            // Skip psiu_* functions
            if (funcName.startsWith('psiu_')) {
                if (isTargetFunc) console.log(`   ❌ Filtered by psiu_ prefix`);
                continue;
            }
            
            // Skip specific unwanted functions
            const unwantedFunctions = ['strcasecmp', 'free'];
            if (unwantedFunctions.includes(funcName)) {
                if (isTargetFunc) console.log(`   ❌ Filtered by unwanted function list`);
                continue;
            }
            
            // Extract full function call with parameters
            // The regex match gives us the position of the function name
            // Now find the opening paren after the function name
            const funcCallStart = match.index;
            const afterFuncName = funcCallStart + funcName.length;
            
            // Find where the '(' starts after the function name (skipping whitespace)
            const openParenPos = codeBlock.indexOf('(', afterFuncName);
            
            let fullCall = funcName;
            
            if (openParenPos !== -1 && openParenPos < afterFuncName + 20) {
                // Find matching closing paren
                const closeParenPos = findMatchingParen(codeBlock, openParenPos);
                
                if (closeParenPos !== -1) {
                    const params = codeBlock.substring(openParenPos + 1, closeParenPos).trim();
                    // Clean up whitespace in parameters (collapse multiple spaces/newlines to single space)
                    const cleanParams = params.replace(/\s+/g, ' ');
                    
                    if (isTargetFunc) {
                        console.log(`   📝 Extracted params: "${cleanParams}" (length: ${cleanParams.length})`);
                    }
                    
                    // Special handling for PCM_OP - show more details
                    if (funcName === 'PCM_OP') {
                        console.log(`   📋 PCM_OP params length: ${cleanParams.length}`);
                        console.log(`   📋 PCM_OP params: "${cleanParams}"`);
                    }
                    
                    // Truncate very long parameter lists - increased limit
                    if (cleanParams.length > 200) {
                        fullCall = `${funcName}(${cleanParams.substring(0, 197)}...)`;
                    } else if (cleanParams.length > 0) {
                        fullCall = `${funcName}(${cleanParams})`;
                    } else {
                        fullCall = `${funcName}()`;
                    }
                    
                    // Extra debug for empty or missing params
                    if (cleanParams.length === 0 && funcName === 'PCM_OP') {
                        console.log(`   ⚠️ PCM_OP has ZERO length params!`);
                        console.log(`   openParenPos: ${openParenPos}, closeParenPos: ${closeParenPos}`);
                    }
                    
                    // Log the final full call for PCM_OP
                    if (funcName === 'PCM_OP') {
                        console.log(`   📋 PCM_OP final fullCall: "${fullCall}"`);
                    }
                } else {
                    if (isTargetFunc) {
                        console.log(`   ⚠️ Could not find matching closing paren`);
                    }
                    if (funcName === 'PCM_OP') {
                        console.log(`   ⚠️⚠️ PCM_OP: Could not find matching closing paren!`);
                        console.log(`   openParenPos: ${openParenPos}, afterFuncName: ${afterFuncName}`);
                    }
                    fullCall = `${funcName}(...)`;
                }
            } else {
                if (isTargetFunc) {
                    console.log(`   ⚠️ Could not find opening paren`);
                }
                if (funcName === 'PCM_OP') {
                    console.log(`   ⚠️⚠️ PCM_OP: Could not find opening paren!`);
                    console.log(`   openParenPos: ${openParenPos}, afterFuncName: ${afterFuncName}`);
                }
                fullCall = `${funcName}(...)`;
            }
            
            if (isTargetFunc) {
                console.log(`   ✅ PASSED all filters! Adding to calls list: ${fullCall}`);
            }
            
            calls.push({ name: funcName, fullCall: fullCall });
        }
        
        // Remove duplicates based on function name
        const seen = new Set();
        const uniqueCalls = calls.filter(call => {
            if (seen.has(call.name)) {
                return false;
            }
            seen.add(call.name);
            return true;
        });
        
        if (hasTargetCall) {
            console.log(`🔍 After processing, found ${uniqueCalls.length} unique calls:`, uniqueCalls.map(c => c.name));
            const hasTarget1 = uniqueCalls.some(c => c.name === 'fm_intu_utils_allow_0dollar_charge_info_in_corres');
            const hasTarget2 = uniqueCalls.some(c => c.name === 'fm_intu_utils_get_currency');
            const hasTarget3 = uniqueCalls.some(c => c.name === 'PCM_OP');
            
            if (hasTarget1) {
                console.log(`   ✅✅✅ fm_intu_utils_allow_0dollar_charge_info_in_corres IS IN THE LIST!`);
            } else if (codeBlock.includes('fm_intu_utils_allow_0dollar_charge_info_in_corres')) {
                console.log(`   ❌❌❌ fm_intu_utils_allow_0dollar_charge_info_in_corres NOT IN FINAL LIST!`);
            }
            
            if (hasTarget2) {
                console.log(`   ✅✅✅ fm_intu_utils_get_currency IS IN THE LIST!`);
            } else if (codeBlock.includes('fm_intu_utils_get_currency')) {
                console.log(`   ❌❌❌ fm_intu_utils_get_currency NOT IN FINAL LIST!`);
            }
            
            if (hasTarget3) {
                console.log(`   ✅✅✅ PCM_OP IS IN THE LIST!`);
                // Show the PCM_OP calls with their parameters
                const pcmOpCalls = uniqueCalls.filter(c => c.name === 'PCM_OP');
                pcmOpCalls.forEach(call => {
                    console.log(`   📋 PCM_OP call: ${call.fullCall}`);
                });
            } else if (codeBlock.includes('PCM_OP')) {
                console.log(`   ❌❌❌ PCM_OP NOT IN FINAL LIST!`);
            }
        }
        
        return uniqueCalls;
    }
    
    // Display results
    function displayResults(functions) {
        if (functions.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="bi bi-info-circle"></i>
                    <h5>No functions with loops and function calls found</h5>
                    <p>The code doesn't contain functions that call other functions within loops</p>
                </div>
            `;
            fullscreenBtn.disabled = true;
            exportBtn.disabled = true;
            return;
        }
        
        let html = '';
        
        // Add summary header
        if (functions.length > 1) {
            html += `
                <div class="alert alert-info mb-3" role="alert">
                    <i class="bi bi-info-circle-fill me-2"></i>
                    <strong>Found ${functions.length} functions</strong> with loops containing function calls. Scroll down to see all.
                </div>
            `;
        }
        
        functions.forEach((func, index) => {
            const loopCount = countTotalLoops(func.loops);
            const callCount = new Set();
            collectAllCalledFunctions(func.loops, callCount);
            
            html += `
                <div class="function-box">
                    <div class="analysis-result">
                        <div class="function-header">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="bi bi-chevron-down collapse-icon"></i>
                                <i class="bi bi-code-square"></i>
                                <span class="function-name">${func.returnType} ${func.name}()</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <span class="loop-count-badge">
                                    <i class="bi bi-arrow-repeat"></i> ${loopCount} Loop${loopCount > 1 ? 's' : ''}
                                </span>
                                <span class="loop-count-badge">
                                    <i class="bi bi-arrow-right-circle"></i> ${callCount.size} Call${callCount.size > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                        <div class="loop-container">
                            ${renderNestedLoops(func.loops, 0)}
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsContainer.innerHTML = html;
        
        // Attach collapse handlers to the newly rendered content
        attachCollapseHandlers(resultsContainer);
        
        // Enable fullscreen and export buttons
        fullscreenBtn.disabled = false;
        exportBtn.disabled = false;
    }
    
    // Count total loops including nested
    function countTotalLoops(loops) {
        let count = loops.length;
        loops.forEach(loop => {
            if (loop.nestedLoops && loop.nestedLoops.length > 0) {
                count += countTotalLoops(loop.nestedLoops);
            }
        });
        return count;
    }
    
    // Render nested loops recursively with indentation
    function renderNestedLoops(loops, level) {
        let html = '';
        const indent = level * 30; // 30px per level
        
        loops.forEach(loop => {
            const loopClass = loop.type === 'for' ? 'loop-for' : 
                             loop.type === 'while' ? 'loop-while' : 'loop-do';
            
            // Count nested loops
            const nestedCount = loop.nestedLoops ? countTotalLoops(loop.nestedLoops) : 0;
            const callCount = loop.calledFunctions ? loop.calledFunctions.length : 0;
            
            html += `
                <div class="nested-loop-item" style="margin-left: ${indent}px;">
                    <div class="loop-header-inline">
                        <span class="loop-type ${loopClass}">${loop.type.toUpperCase()}</span>
                        <span class="loop-condition-inline">Condition: ${escapeHtml(loop.condition)}</span>
            `;
            
            // Show nested loop count and call count badges
            if (nestedCount > 0 || callCount > 0) {
                html += `<div style="display: flex; gap: 5px; align-items: center;">`;
                if (nestedCount > 0) {
                    html += `<span class="badge bg-info" style="font-size: 0.7rem;">${nestedCount} nested loop${nestedCount > 1 ? 's' : ''}</span>`;
                }
                if (callCount > 0) {
                    html += `<span class="badge bg-success" style="font-size: 0.7rem;">${callCount} call${callCount > 1 ? 's' : ''}</span>`;
                }
                html += `</div>`;
            }
            
            html += `</div>`; // Close loop-header-inline
            
            // Show direct function calls at this level
            if (loop.calledFunctions && loop.calledFunctions.length > 0) {
                html += `<div class="direct-calls" style="margin-left: 20px; margin-top: 8px;">`;
                loop.calledFunctions.forEach(func => {
                    // func is now an object { name, fullCall }
                    const displayCall = typeof func === 'object' ? func.fullCall : func;
                    
                    // Debug PCM_OP display
                    if ((typeof func === 'object' && func.name === 'PCM_OP') || displayCall.startsWith('PCM_OP')) {
                        console.log(`🖼️ Rendering PCM_OP: "${displayCall}"`);
                        console.log(`   func object:`, func);
                    }
                    
                    html += `<div class="called-function-item"><i class="bi bi-arrow-right-circle"></i> ${escapeHtml(displayCall)}</div>`;
                });
                html += `</div>`;
            }
            
            // Show nested loops
            if (loop.nestedLoops && loop.nestedLoops.length > 0) {
                html += renderNestedLoops(loop.nestedLoops, level + 1);
            }
            
            html += `</div>`;
        });
        
        return html;
    }
    
    // Update statistics
    function updateStatistics(functions) {
        const funcCount = functions.length;
        let loopCount = 0;
        const calledFuncs = new Set();
        
        functions.forEach(func => {
            loopCount += countTotalLoops(func.loops);
            collectAllCalledFunctions(func.loops, calledFuncs);
        });
        
        functionsWithLoops.textContent = funcCount;
        totalLoops.textContent = loopCount;
        functionsInLoops.textContent = calledFuncs.size;
    }
    
    // Collect all called functions recursively
    function collectAllCalledFunctions(loops, calledFuncs) {
        loops.forEach(loop => {
            loop.calledFunctions.forEach(cf => {
                // cf is now an object { name, fullCall }
                const funcName = typeof cf === 'object' ? cf.name : cf;
                calledFuncs.add(funcName);
            });
            if (loop.nestedLoops && loop.nestedLoops.length > 0) {
                collectAllCalledFunctions(loop.nestedLoops, calledFuncs);
            }
        });
    }
    
    // Generate text report
    function generateReport(functions) {
        let report = '='.repeat(60) + '\n';
        report += 'C LOOP ANALYSIS REPORT\n';
        report += '='.repeat(60) + '\n\n';
        report += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        report += 'SUMMARY:\n';
        report += `-`.repeat(60) + '\n';
        report += `Functions with loops: ${functions.length}\n`;
        
        let totalLoops = 0;
        const allCalledFuncs = new Set();
        functions.forEach(func => {
            totalLoops += countTotalLoops(func.loops);
            collectAllCalledFunctions(func.loops, allCalledFuncs);
        });
        
        report += `Total loops found: ${totalLoops}\n`;
        report += `Unique functions called in loops: ${allCalledFuncs.size}\n\n`;
        
        report += 'DETAILED ANALYSIS:\n';
        report += '='.repeat(60) + '\n\n';
        
        functions.forEach((func, idx) => {
            report += `${idx + 1}. Function: ${func.returnType} ${func.name}() - loops used\n`;
            report += `   ${'-'.repeat(56)}\n`;
            report += generateLoopReport(func.loops, 1);
            report += '\n';
        });
        
        return report;
    }
    
    // Generate loop report recursively
    function generateLoopReport(loops, level) {
        let report = '';
        const indent = '   '.repeat(level);
        
        loops.forEach((loop, idx) => {
            report += `${indent}${loop.type.toUpperCase()} - Condition: ${loop.condition}\n`;
            
            if (loop.calledFunctions.length > 0) {
                loop.calledFunctions.forEach(cf => {
                    // cf is now an object { name, fullCall }
                    const displayCall = typeof cf === 'object' ? cf.fullCall : cf;
                    report += `${indent}   └─ ${displayCall}\n`;
                });
            }
            
            if (loop.nestedLoops && loop.nestedLoops.length > 0) {
                report += generateLoopReport(loop.nestedLoops, level + 1);
            }
        });
        
        return report;
    }
    
    // Escape HTML
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
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
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            analyzeBtn.click();
        }
    });
});

