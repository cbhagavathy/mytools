document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const codeInput = document.getElementById('codeInput');
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyMermaidBtn = document.getElementById('copyMermaidBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    const mermaidDiagram = document.getElementById('mermaidDiagram');
    const flowchartContainer = document.getElementById('flowchartContainer');
    const diagramControls = document.getElementById('diagramControls');
    const layoutSelect = document.getElementById('layoutSelect');
    
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    
    const functionCount = document.getElementById('functionCount');
    const callCount = document.getElementById('callCount');
    const entryPoint = document.getElementById('entryPoint');
    const functionList = document.getElementById('functionList');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    let currentMermaidCode = '';
    let currentZoom = 1.0;
    let functionsData = [];
    
    // Fullscreen elements
    const fullscreenContainer = document.getElementById('fullscreenContainer');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const fullscreenMermaidDiagram = document.getElementById('fullscreenMermaidDiagram');
    const fsLayoutSelect = document.getElementById('fsLayoutSelect');
    const fsZoomInBtn = document.getElementById('fsZoomInBtn');
    const fsZoomOutBtn = document.getElementById('fsZoomOutBtn');
    const fsZoomResetBtn = document.getElementById('fsZoomResetBtn');
    const fsZoomLevel = document.getElementById('fsZoomLevel');
    const fsDownloadBtn = document.getElementById('fsDownloadBtn');
    let fsCurrentZoom = 1.0;
    
    // Generate button click
    generateBtn.addEventListener('click', function() {
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter C code', 'warning');
            return;
        }
        
        try {
            const analysis = analyzeCode(code);
            functionsData = analysis.functions;
            
            if (functionsData.length === 0) {
                showNotification('No functions found in the code', 'warning');
                return;
            }
            
            generateFlowchart(analysis);
            updateStatistics(analysis);
            updateFunctionList(functionsData);
            
            showNotification('Flowchart generated successfully!', 'success');
        } catch (error) {
            showNotification('Error analyzing code: ' + error.message, 'error');
            console.error(error);
        }
    });
    
    // Clear button click
    clearBtn.addEventListener('click', function() {
        codeInput.value = '';
        mermaidDiagram.innerHTML = '';
        mermaidDiagram.style.display = 'none';
        flowchartContainer.querySelector('.empty-state').style.display = 'flex';
        diagramControls.style.display = 'none';
        
        downloadBtn.disabled = true;
        copyMermaidBtn.disabled = true;
        fullscreenBtn.disabled = true;
        
        updateStatistics({ functions: [], totalCalls: 0, entryFunction: null });
        functionList.innerHTML = '<p class="text-muted text-center">No functions detected yet</p>';
        
        showNotification('Cleared', 'info');
    });
    
    // Layout change
    layoutSelect.addEventListener('change', function() {
        if (functionsData.length > 0) {
            generateFlowchart({ functions: functionsData });
        }
    });
    
    // Zoom controls
    zoomInBtn.addEventListener('click', function() {
        currentZoom += 0.1;
        applyZoom();
    });
    
    zoomOutBtn.addEventListener('click', function() {
        currentZoom = Math.max(0.3, currentZoom - 0.1);
        applyZoom();
    });
    
    zoomResetBtn.addEventListener('click', function() {
        currentZoom = 1.0;
        applyZoom();
    });
    
    function applyZoom() {
        const svg = mermaidDiagram.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${currentZoom})`;
            svg.style.transformOrigin = 'top center';
        }
    }
    
    // Download PNG
    downloadBtn.addEventListener('click', function() {
        const svg = mermaidDiagram.querySelector('svg');
        if (!svg) {
            showNotification('No diagram to download', 'warning');
            return;
        }
        
        try {
            // Convert SVG to canvas and download
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'function_flowchart.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    showNotification('Flowchart downloaded!', 'success');
                });
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            showNotification('Failed to download diagram', 'error');
            console.error(error);
        }
    });
    
    // Copy Mermaid code
    copyMermaidBtn.addEventListener('click', async function() {
        if (!currentMermaidCode) {
            showNotification('No Mermaid code to copy', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(currentMermaidCode);
            showNotification('Mermaid code copied to clipboard!', 'success');
        } catch (err) {
            showNotification('Failed to copy Mermaid code', 'error');
        }
    });
    
    // Analyze C code
    function analyzeCode(code) {
        // Remove comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');
        code = code.replace(/\/\/.*/g, '');
        
        const functions = [];
        
        // Regex to match function definitions
        const functionRegex = /(\w+)\s+(\w+)\s*\([^)]*\)\s*{/g;
        let match;
        
        while ((match = functionRegex.exec(code)) !== null) {
            const returnType = match[1];
            const functionName = match[2];
            
            // Extract function body
            const startIdx = match.index + match[0].length;
            let braceCount = 1;
            let endIdx = startIdx;
            
            for (let i = startIdx; i < code.length && braceCount > 0; i++) {
                if (code[i] === '{') braceCount++;
                if (code[i] === '}') braceCount--;
                endIdx = i;
            }
            
            const functionBody = code.substring(startIdx, endIdx);
            
            // Find function calls in this function
            const calls = [];
            const callRegex = /\b(\w+)\s*\(/g;
            let callMatch;
            
            while ((callMatch = callRegex.exec(functionBody)) !== null) {
                const calledFunction = callMatch[1];
                
                // Filter out common C keywords and standard library functions
                const keywords = ['if', 'while', 'for', 'switch', 'sizeof', 'return', 'printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'strcmp'];
                
                if (!keywords.includes(calledFunction) && calledFunction !== functionName) {
                    calls.push(calledFunction);
                }
            }
            
            // Remove duplicates
            const uniqueCalls = [...new Set(calls)];
            
            // Check for recursive calls (function calling itself)
            const isRecursive = uniqueCalls.includes(functionName);
            
            // Check which calls are in loops
            const callsInLoops = [];
            uniqueCalls.forEach(calledFunc => {
                // Check if the call is inside a loop
                const loopRegex = new RegExp(`(for|while|do)\\s*\\([^)]*\\)\\s*{[^}]*\\b${calledFunc}\\s*\\(`, 'g');
                if (loopRegex.test(functionBody)) {
                    callsInLoops.push(calledFunc);
                }
            });
            
            functions.push({
                name: functionName,
                returnType: returnType,
                calls: uniqueCalls,
                isRecursive: isRecursive,
                callsInLoops: callsInLoops
            });
        }
        
        // Calculate total calls
        let totalCalls = 0;
        functions.forEach(func => {
            totalCalls += func.calls.length;
        });
        
        // Determine entry point (usually main)
        const mainFunc = functions.find(f => f.name === 'main');
        const entryFunction = mainFunc ? mainFunc.name : (functions.length > 0 ? functions[0].name : null);
        
        return {
            functions: functions,
            totalCalls: totalCalls,
            entryFunction: entryFunction
        };
    }
    
    // Generate flowchart
    function generateFlowchart(analysis) {
        const direction = layoutSelect.value;
        const functions = analysis.functions;
        
        if (functions.length === 0) {
            return;
        }
        
        // Build Mermaid diagram
        let mermaidCode = `graph ${direction}\n`;
        
        // Define nodes
        functions.forEach(func => {
            const nodeStyle = func.name === 'main' ? '([' + func.name + '])' : '[' + func.name + ']';
            mermaidCode += `    ${func.name}${nodeStyle}\n`;
        });
        
        mermaidCode += '\n';
        
        // Define edges (function calls)
        functions.forEach(func => {
            func.calls.forEach(calledFunc => {
                // Check if the called function exists in our function list
                const exists = functions.find(f => f.name === calledFunc);
                if (exists) {
                    // Check if it's a recursive call
                    if (func.name === calledFunc) {
                        mermaidCode += `    ${func.name} -->|recursive| ${calledFunc}\n`;
                    }
                    // Check if it's called in a loop
                    else if (func.callsInLoops.includes(calledFunc)) {
                        mermaidCode += `    ${func.name} -.->|in loop| ${calledFunc}\n`;
                    }
                    // Normal call
                    else {
                        mermaidCode += `    ${func.name} --> ${calledFunc}\n`;
                    }
                }
            });
        });
        
        // Add styling
        mermaidCode += '\n';
        mermaidCode += '    classDef mainFunc fill:#e1f5e1,stroke:#4caf50,stroke-width:3px\n';
        mermaidCode += '    classDef normalFunc fill:#e3f2fd,stroke:#2196f3,stroke-width:2px\n';
        mermaidCode += '    classDef recursiveFunc fill:#fff3e0,stroke:#ff9800,stroke-width:3px\n';
        
        if (analysis.entryFunction) {
            mermaidCode += `    class ${analysis.entryFunction} mainFunc\n`;
        }
        
        // Highlight recursive functions
        functions.forEach(func => {
            if (func.isRecursive) {
                mermaidCode += `    class ${func.name} recursiveFunc\n`;
            }
        });
        
        // Add link styling for loops
        mermaidCode += '    linkStyle default stroke:#2196f3,stroke-width:2px\n';
        
        currentMermaidCode = mermaidCode;
        
        // Render diagram
        renderMermaidDiagram(mermaidCode);
    }
    
    // Render Mermaid diagram
    async function renderMermaidDiagram(mermaidCode) {
        try {
            const uniqueId = 'mermaid-' + Date.now();
            const { svg } = await mermaid.render(uniqueId, mermaidCode);
            
            mermaidDiagram.innerHTML = svg;
            mermaidDiagram.style.display = 'block';
            flowchartContainer.querySelector('.empty-state').style.display = 'none';
            diagramControls.style.display = 'flex';
            
            downloadBtn.disabled = false;
            copyMermaidBtn.disabled = false;
            fullscreenBtn.disabled = false;
            
            currentZoom = 1.0;
            applyZoom();
        } catch (error) {
            showNotification('Failed to render diagram: ' + error.message, 'error');
            console.error(error);
        }
    }
    
    // Update statistics
    function updateStatistics(analysis) {
        functionCount.textContent = analysis.functions.length;
        callCount.textContent = analysis.totalCalls;
        entryPoint.textContent = analysis.entryFunction || '-';
    }
    
    // Update function list
    function updateFunctionList(functions) {
        if (functions.length === 0) {
            functionList.innerHTML = '<p class="text-muted text-center">No functions detected yet</p>';
            return;
        }
        
        let html = '';
        functions.forEach(func => {
            let callsText = '';
            
            if (func.calls.length > 0) {
                const callsList = func.calls.map(call => {
                    if (call === func.name) {
                        return `<strong style="color: #ff9800;">${call} (recursive)</strong>`;
                    } else if (func.callsInLoops.includes(call)) {
                        return `<strong style="color: #2196f3;">${call} (in loop)</strong>`;
                    }
                    return call;
                }).join(', ');
                
                callsText = `Calls: ${callsList}`;
            } else {
                callsText = 'No function calls';
            }
            
            const iconColor = func.isRecursive ? 'text-warning' : 'text-primary';
            const badge = func.isRecursive ? '<span class="badge bg-warning text-dark ms-2">Recursive</span>' : '';
            
            html += `
                <div class="function-item">
                    <i class="bi bi-code-square ${iconColor}"></i>
                    <div class="flex-grow-1">
                        <div class="function-name">${func.returnType} ${func.name}()${badge}</div>
                        <div class="function-calls">${callsText}</div>
                    </div>
                </div>
            `;
        });
        
        functionList.innerHTML = html;
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
    
    // Fullscreen button
    fullscreenBtn.addEventListener('click', function() {
        if (!currentMermaidCode) {
            showNotification('No flowchart to view', 'warning');
            return;
        }
        
        // Render diagram in fullscreen
        renderFullscreenDiagram();
        
        // Show fullscreen
        fullscreenContainer.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Exit fullscreen
    exitFullscreenBtn.addEventListener('click', exitFullscreen);
    
    // Fullscreen zoom controls
    fsZoomInBtn.addEventListener('click', function() {
        fsCurrentZoom += 0.1;
        applyFullscreenZoom();
    });
    
    fsZoomOutBtn.addEventListener('click', function() {
        fsCurrentZoom = Math.max(0.3, fsCurrentZoom - 0.1);
        applyFullscreenZoom();
    });
    
    fsZoomResetBtn.addEventListener('click', function() {
        fsCurrentZoom = 1.0;
        applyFullscreenZoom();
    });
    
    function applyFullscreenZoom() {
        const svg = fullscreenMermaidDiagram.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${fsCurrentZoom})`;
            svg.style.transformOrigin = 'top center';
            fsZoomLevel.textContent = Math.round(fsCurrentZoom * 100) + '%';
        }
    }
    
    // Fullscreen layout change
    fsLayoutSelect.addEventListener('change', function() {
        if (functionsData.length > 0) {
            renderFullscreenDiagram();
        }
    });
    
    // Fullscreen download
    fsDownloadBtn.addEventListener('click', function() {
        const svg = fullscreenMermaidDiagram.querySelector('svg');
        if (!svg) return;
        
        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'function_flowchart_fullscreen.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    showNotification('Flowchart downloaded!', 'success');
                });
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            showNotification('Failed to download diagram', 'error');
        }
    });
    
    // Render fullscreen diagram
    async function renderFullscreenDiagram() {
        const direction = fsLayoutSelect.value;
        
        // Build mermaid code with current layout
        let mermaidCode = currentMermaidCode.replace(/graph (TB|LR)/, `graph ${direction}`);
        
        try {
            const uniqueId = 'mermaid-fs-' + Date.now();
            const { svg } = await mermaid.render(uniqueId, mermaidCode);
            
            fullscreenMermaidDiagram.innerHTML = svg;
            
            fsCurrentZoom = 1.0;
            applyFullscreenZoom();
        } catch (error) {
            showNotification('Failed to render fullscreen diagram', 'error');
            console.error(error);
        }
    }
    
    // Exit fullscreen
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
    
    // Keyboard shortcuts
    codeInput.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            generateBtn.click();
        }
    });
});

