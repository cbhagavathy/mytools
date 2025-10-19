document.addEventListener('DOMContentLoaded', function() {
    const codeInput = document.getElementById('codeInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const statsSection = document.getElementById('statsSection');
    const statsGrid = document.getElementById('statsGrid');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    // Analyze code
    analyzeBtn.addEventListener('click', function() {
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter C code to analyze', 'warning');
            return;
        }
        
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analyzing...';
        
        setTimeout(() => {
            const leaks = detectMemoryLeaks(code);
            displayResults(leaks);
            displayStatistics(leaks);
            
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="bi bi-search"></i> Analyze Code';
            
            if (leaks.length === 0) {
                showNotification('✅ No memory leaks detected!', 'success');
            } else {
                showNotification(`⚠️ Found ${leaks.length} potential memory leak(s)`, 'warning');
            }
        }, 500);
    });
    
    // Clear
    clearBtn.addEventListener('click', function() {
        codeInput.value = '';
        resultsContainer.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-search" style="font-size: 3rem; opacity: 0.5;"></i>
                <p class="mt-3">Click "Analyze Code" to detect memory leaks</p>
            </div>
        `;
        statsSection.style.display = 'none';
        showNotification('Cleared', 'info');
    });
    
    // Detect memory leaks
    function detectMemoryLeaks(code) {
        const leaks = [];
        const lines = code.split('\n');
        
        // Track allocations and frees
        const allocations = {};
        const frees = new Set();
        
        // Find all functions
        const functions = extractFunctions(code);
        
        functions.forEach(func => {
            const funcLeaks = analyzeFunctionForLeaks(func);
            leaks.push(...funcLeaks);
        });
        
        return leaks;
    }
    
    // Extract functions from code
    function extractFunctions(code) {
        const functions = [];
        const funcRegex = /(?:static\s+)?(?:inline\s+)?(?:const\s+)?(\w+\s+\**\s*)(\w+)\s*\([^)]*\)\s*\{/g;
        
        let match;
        while ((match = funcRegex.exec(code)) !== null) {
            const funcStart = match.index;
            const funcName = match[2];
            
            // Find function body
            const bodyStart = code.indexOf('{', funcStart);
            let braceCount = 1;
            let bodyEnd = bodyStart + 1;
            
            for (let i = bodyStart + 1; i < code.length && braceCount > 0; i++) {
                if (code[i] === '{') braceCount++;
                if (code[i] === '}') braceCount--;
                if (braceCount === 0) {
                    bodyEnd = i;
                    break;
                }
            }
            
            const funcBody = code.substring(bodyStart, bodyEnd + 1);
            const lineNumber = code.substring(0, funcStart).split('\n').length;
            
            functions.push({
                name: funcName,
                body: funcBody,
                fullCode: code.substring(funcStart, bodyEnd + 1),
                startLine: lineNumber
            });
        }
        
        return functions;
    }
    
    // Analyze function for memory leaks
    function analyzeFunctionForLeaks(func) {
        const leaks = [];
        const allocations = {};
        const frees = new Set();
        
        // Find allocations (including custom PIN macros)
        // Match both regular assignment (var = ...) and dereferenced assignment (*var = ...)
        const allocRegex = /(\*?)(\w+)\s*=\s*(malloc|calloc|realloc|strdup|PIN_FLIST_CREATE)\s*\([^)]*\)/g;
        let match;
        
        while ((match = allocRegex.exec(func.body)) !== null) {
            const isDereferenced = match[1] === '*'; // Check if it's *varName = ...
            const varName = match[2];
            const allocType = match[3];
            
            // Skip tracking if allocated directly to output parameter (*out_param = ...)
            // The caller is responsible for freeing it
            if (isDereferenced) {
                continue;
            }
            
            const lineInFunc = func.body.substring(0, match.index).split('\n').length;
            const globalLine = func.startLine + lineInFunc - 1;
            
            if (!allocations[varName]) {
                allocations[varName] = [];
            }
            
            allocations[varName].push({
                type: allocType,
                line: globalLine,
                code: match[0]
            });
        }
        
        // Find frees (including custom PIN macros)
        // PIN_FLIST_DESTROY uses &varName
        // INTU_FLIST_DESTROY_EX uses &varName with additional parameter
        // free uses varName
        const freeRegex = /(?:free\s*\(\s*(\w+)\s*\)|PIN_FLIST_DESTROY\s*\(\s*&\s*(\w+)\s*\)|INTU_FLIST_DESTROY_EX\s*\(\s*&\s*(\w+)\s*,\s*[^)]*\))/g;
        while ((match = freeRegex.exec(func.body)) !== null) {
            const varName = match[1] || match[2] || match[3]; // match[1]=free, match[2]=PIN_FLIST_DESTROY, match[3]=INTU_FLIST_DESTROY_EX
            frees.add(varName);
        }
        
        // Check for leaks
        for (const [varName, allocs] of Object.entries(allocations)) {
            if (!frees.has(varName)) {
                // Check if variable is returned
                const returnRegex = new RegExp(`return\\s+${varName}`, 'g');
                const isReturned = returnRegex.test(func.body);
                
                // Check if variable is assigned to an output parameter (e.g., *out_flistp = varName)
                // This means the caller is responsible for freeing it
                const outputParamRegex = new RegExp(`\\*\\w+\\s*=\\s*${varName}`, 'g');
                const isAssignedToOutputParam = outputParamRegex.test(func.body);
                
                if (!isReturned && !isAssignedToOutputParam) {
                    const allocType = allocs[0].type;
                    const freeCall = allocType === 'PIN_FLIST_CREATE' 
                        ? `INTU_FLIST_DESTROY_EX(&${varName}, NULL)` 
                        : `free(${varName})`;
                    
                    leaks.push({
                        type: 'unfreed_memory',
                        severity: 'critical',
                        variable: varName,
                        function: func.name,
                        allocation: allocs[0],
                        description: `Memory allocated for '${varName}' is never freed`,
                        recommendation: `Add ${freeCall} before the function returns or goes out of scope`,
                        code: func.fullCode
                    });
                }
            }
            
            // Check for multiple allocations without free
            if (allocs.length > 1) {
                const allocType = allocs[0].type;
                const freeCall = allocType === 'PIN_FLIST_CREATE' 
                    ? `INTU_FLIST_DESTROY_EX(&${varName}, NULL)` 
                    : `free(${varName})`;
                
                leaks.push({
                    type: 'multiple_alloc',
                    severity: 'high',
                    variable: varName,
                    function: func.name,
                    allocation: allocs[allocs.length - 1],
                    description: `Variable '${varName}' is allocated ${allocs.length} times, potentially overwriting previous allocations`,
                    recommendation: `Free the previous memory before reassigning: ${freeCall} before the new allocation`,
                    code: func.fullCode
                });
            }
        }
        
        // Check for memory allocation in loops
        const loopAllocations = detectLoopAllocations(func);
        leaks.push(...loopAllocations);
        
        // Check for conditional frees
        const conditionalFreeLeaks = detectConditionalFrees(func, allocations, frees);
        leaks.push(...conditionalFreeLeaks);
        
        return leaks;
    }
    
    // Detect allocations inside loops
    function detectLoopAllocations(func) {
        const leaks = [];
        const loopRegex = /(for|while)\s*\([^)]*\)\s*\{([^}]*)\}/g;
        
        let match;
        while ((match = loopRegex.exec(func.body)) !== null) {
            const loopBody = match[2];
            const allocInLoop = /(\*?)(\w+)\s*=\s*(malloc|calloc|realloc|PIN_FLIST_CREATE)\s*\([^)]*\)/g;
            
            let allocMatch;
            while ((allocMatch = allocInLoop.exec(loopBody)) !== null) {
                const isDereferenced = allocMatch[1] === '*';
                const varName = allocMatch[2];
                const allocType = allocMatch[3];
                
                // Skip if allocated to output parameter
                if (isDereferenced) {
                    continue;
                }
                
                // Check for corresponding free/destroy
                // PIN_FLIST_DESTROY uses &varName
                // INTU_FLIST_DESTROY_EX uses &varName with additional parameter
                // free uses varName
                const freeInLoop = new RegExp(`(?:free\\s*\\(\\s*${varName}\\s*\\)|PIN_FLIST_DESTROY\\s*\\(\\s*&\\s*${varName}\\s*\\)|INTU_FLIST_DESTROY_EX\\s*\\(\\s*&\\s*${varName}\\s*,\\s*[^)]*\\))`, 'g');
                
                if (!freeInLoop.test(loopBody)) {
                    const lineInFunc = func.body.substring(0, match.index).split('\n').length;
                    const globalLine = func.startLine + lineInFunc - 1;
                    
                    const freeCall = allocType === 'PIN_FLIST_CREATE' 
                        ? `INTU_FLIST_DESTROY_EX(&${varName}, NULL)` 
                        : `free(${varName})`;
                    
                    leaks.push({
                        type: 'loop_allocation',
                        severity: 'critical',
                        variable: varName,
                        function: func.name,
                        allocation: { line: globalLine, code: allocMatch[0] },
                        description: `Memory allocated for '${varName}' inside a loop without corresponding cleanup`,
                        recommendation: `Add ${freeCall} inside the loop or ensure proper cleanup after loop`,
                        code: match[0]
                    });
                }
            }
        }
        
        return leaks;
    }
    
    // Detect conditional frees (potential issues)
    function detectConditionalFrees(func, allocations, frees) {
        const leaks = [];
        
        for (const [varName, allocs] of Object.entries(allocations)) {
            // Check if free/destroy is inside an if statement
            // PIN_FLIST_DESTROY uses &varName
            // INTU_FLIST_DESTROY_EX uses &varName with additional parameter
            // free uses varName
            const conditionalFreeRegex = new RegExp(`if\\s*\\([^)]*\\)\\s*\\{[^}]*(?:free\\s*\\(\\s*${varName}\\s*\\)|PIN_FLIST_DESTROY\\s*\\(\\s*&\\s*${varName}\\s*\\)|INTU_FLIST_DESTROY_EX\\s*\\(\\s*&\\s*${varName}\\s*,\\s*[^)]*\\))[^}]*\\}`, 'g');
            
            if (conditionalFreeRegex.test(func.body)) {
                const allocType = allocs[0].type;
                const freeCall = allocType === 'PIN_FLIST_CREATE' 
                    ? `INTU_FLIST_DESTROY_EX(&${varName}, NULL)` 
                    : `free(${varName})`;
                
                leaks.push({
                    type: 'conditional_free',
                    severity: 'medium',
                    variable: varName,
                    function: func.name,
                    allocation: allocs[0],
                    description: `Memory for '${varName}' is freed conditionally, which may lead to leaks if condition is not met`,
                    recommendation: `Ensure all code paths call ${freeCall}, or use goto cleanup pattern`,
                    code: func.fullCode
                });
            }
        }
        
        return leaks;
    }
    
    // Display results
    function displayResults(leaks) {
        if (leaks.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-leaks">
                    <i class="bi bi-check-circle-fill"></i>
                    <h4>No Memory Leaks Detected!</h4>
                    <p class="mb-0">Your code appears to properly manage memory allocations and deallocations.</p>
                </div>
            `;
            return;
        }
        
        // Sort by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        leaks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        
        let html = `
            <div class="expand-collapse-controls">
                <button class="btn-control" id="expandAllBtn">
                    <i class="bi bi-arrows-expand"></i> Expand All
                </button>
                <button class="btn-control" id="collapseAllBtn">
                    <i class="bi bi-arrows-collapse"></i> Collapse All
                </button>
            </div>
        `;
        
        leaks.forEach((leak, index) => {
            html += `
                <div class="leak-card leak-${leak.severity}">
                    <div class="leak-card-header" data-leak-index="${index}">
                        <div style="flex: 1; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span class="severity-badge badge-${leak.severity}">${leak.severity.toUpperCase()}</span>
                            <strong style="color: #1e3c72;">Leak #${index + 1}: ${formatLeakType(leak.type)}</strong>
                            <span style="color: #6c757d;">|</span>
                            <span class="badge" style="background: #0d6efd; color: white; font-weight: 600; padding: 4px 10px;">Line ${leak.allocation.line}</span>
                            <span style="color: #6c757d;">|</span>
                            <span style="color: #495057;">Function: <strong>${leak.function}</strong></span>
                            <span style="color: #6c757d;">|</span>
                            <span style="color: #495057;">Variable: <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${leak.variable}</code></span>
                        </div>
                        <i class="bi bi-chevron-down toggle-icon" id="toggle-${index}"></i>
                    </div>
                    
                    <div class="leak-card-body" id="body-${index}">
                        <div class="leak-description">
                            <strong>Issue:</strong> ${leak.description}
                        </div>
                        
                        <div class="code-snippet">
                            <div class="line-highlight">${escapeHtml(leak.allocation.code)}</div>
                        </div>
                        
                        <div class="recommendation">
                            <strong><i class="bi bi-lightbulb"></i> Recommendation:</strong><br>
                            ${leak.recommendation}
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsContainer.innerHTML = html;
        
        // Attach event listeners for expand/collapse
        attachExpandCollapseListeners(leaks.length);
    }
    
    // Attach expand/collapse event listeners
    function attachExpandCollapseListeners(leakCount) {
        // Individual card toggles
        for (let i = 0; i < leakCount; i++) {
            const header = document.querySelector(`[data-leak-index="${i}"]`);
            if (header) {
                header.addEventListener('click', function() {
                    toggleLeak(i);
                });
            }
        }
        
        // Expand All button
        const expandAllBtn = document.getElementById('expandAllBtn');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', function() {
                for (let i = 0; i < leakCount; i++) {
                    expandLeak(i);
                }
                showNotification('All leaks expanded', 'info');
            });
        }
        
        // Collapse All button
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', function() {
                for (let i = 0; i < leakCount; i++) {
                    collapseLeak(i);
                }
                showNotification('All leaks collapsed', 'info');
            });
        }
    }
    
    // Toggle individual leak
    function toggleLeak(index) {
        const body = document.getElementById(`body-${index}`);
        const icon = document.getElementById(`toggle-${index}`);
        
        if (body.classList.contains('collapsed')) {
            body.classList.remove('collapsed');
            icon.classList.remove('collapsed');
        } else {
            body.classList.add('collapsed');
            icon.classList.add('collapsed');
        }
    }
    
    // Expand individual leak
    function expandLeak(index) {
        const body = document.getElementById(`body-${index}`);
        const icon = document.getElementById(`toggle-${index}`);
        
        body.classList.remove('collapsed');
        icon.classList.remove('collapsed');
    }
    
    // Collapse individual leak
    function collapseLeak(index) {
        const body = document.getElementById(`body-${index}`);
        const icon = document.getElementById(`toggle-${index}`);
        
        body.classList.add('collapsed');
        icon.classList.add('collapsed');
    }
    
    // Display statistics
    function displayStatistics(leaks) {
        if (leaks.length === 0) {
            statsSection.style.display = 'none';
            return;
        }
        
        statsSection.style.display = 'block';
        
        const stats = {
            total: leaks.length,
            critical: leaks.filter(l => l.severity === 'critical').length,
            high: leaks.filter(l => l.severity === 'high').length,
            medium: leaks.filter(l => l.severity === 'medium').length,
            low: leaks.filter(l => l.severity === 'low').length
        };
        
        const types = {};
        leaks.forEach(leak => {
            types[leak.type] = (types[leak.type] || 0) + 1;
        });
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #dc3545;">${stats.critical}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #fd7e14;">${stats.high}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #ffc107;">${stats.medium}</div>
                <div class="stat-label">Medium</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #17a2b8;">${stats.low}</div>
                <div class="stat-label">Low</div>
            </div>
        `;
    }
    
    // Format leak type
    function formatLeakType(type) {
        const types = {
            'unfreed_memory': 'Unfreed Memory',
            'multiple_alloc': 'Multiple Allocations',
            'loop_allocation': 'Loop Allocation',
            'conditional_free': 'Conditional Free',
            'double_free': 'Potential Double Free'
        };
        return types[type] || type;
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
        return text.replace(/[&<>"']/g, m => map[m]);
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
});

