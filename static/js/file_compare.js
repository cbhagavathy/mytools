// File Compare JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const text1 = document.getElementById('text1');
    const text2 = document.getElementById('text2');
    const lines1Count = document.getElementById('lines1Count');
    const lines2Count = document.getElementById('lines2Count');
    
    const compareBtn = document.getElementById('compareBtn');
    const clearBtn = document.getElementById('clearBtn');
    const swapBtn = document.getElementById('swapBtn');
    const copyDiffBtn = document.getElementById('copyDiffBtn');
    
    const sideBySideMode = document.getElementById('sideBySideMode');
    const unifiedMode = document.getElementById('unifiedMode');
    
    const statsSection = document.getElementById('statsSection');
    const diffSection = document.getElementById('diffSection');
    const diffResults = document.getElementById('diffResults');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    
    // Update line counts
    text1.addEventListener('input', updateLineCounts);
    text2.addEventListener('input', updateLineCounts);
    
    function updateLineCounts() {
        const lines1 = text1.value.split('\n').length;
        const lines2 = text2.value.split('\n').length;
        lines1Count.textContent = lines1;
        lines2Count.textContent = lines2;
    }
    
    // Initialize counts
    updateLineCounts();
    
    // Compare button
    compareBtn.addEventListener('click', async function() {
        const text1Value = text1.value;
        const text2Value = text2.value;
        
        if (!text1Value && !text2Value) {
            showNotification('Please enter text in at least one field', 'warning');
            return;
        }
        
        const viewMode = document.querySelector('input[name="viewMode"]:checked').value;
        
        compareBtn.disabled = true;
        compareBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Comparing...';
        
        try {
            const response = await fetch('/api/compare-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text1: text1Value,
                    text2: text2Value,
                    type: viewMode
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                displayStats(data.stats);
                
                if (data.type === 'side-by-side') {
                    displaySideBySideDiff(data.diff);
                } else {
                    displayUnifiedDiff(data.diff);
                }
                
                statsSection.style.display = 'block';
                diffSection.style.display = 'block';
                
                showNotification('Comparison completed successfully!', 'success');
            } else {
                showNotification(data.message, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error: ' + error.message, 'danger');
        } finally {
            compareBtn.disabled = false;
            compareBtn.innerHTML = '<i class="bi bi-arrow-left-right"></i> Compare';
        }
    });
    
    // Display statistics
    function displayStats(stats) {
        document.getElementById('similarityPercent').textContent = stats.similarity_percent + '%';
        document.getElementById('linesAdded').textContent = stats.lines_added;
        document.getElementById('linesDeleted').textContent = stats.lines_deleted;
        document.getElementById('linesModified').textContent = stats.lines_modified;
        document.getElementById('totalLinesLeft').textContent = stats.total_lines_left;
        document.getElementById('totalLinesRight').textContent = stats.total_lines_right;
    }
    
    // Display side-by-side diff
    function displaySideBySideDiff(diff) {
        let html = '';
        
        diff.forEach(line => {
            let leftClass = '';
            let rightClass = '';
            
            if (line.type === 'delete') {
                leftClass = 'diff-delete';
                rightClass = 'diff-equal';
            } else if (line.type === 'insert') {
                leftClass = 'diff-equal';
                rightClass = 'diff-insert';
            } else if (line.type === 'replace') {
                leftClass = 'diff-replace';
                rightClass = 'diff-replace';
            } else {
                leftClass = 'diff-equal';
                rightClass = 'diff-equal';
            }
            
            html += '<div class="diff-row">';
            
            // Left side
            html += '<div class="diff-cell ' + leftClass + '">';
            html += '<div class="diff-line-number">' + (line.left_line || '') + '</div>';
            html += '<div class="diff-line-content">' + escapeHtml(line.left_content || '') + '</div>';
            html += '</div>';
            
            // Right side
            html += '<div class="diff-cell ' + rightClass + '">';
            html += '<div class="diff-line-number">' + (line.right_line || '') + '</div>';
            html += '<div class="diff-line-content">' + escapeHtml(line.right_content || '') + '</div>';
            html += '</div>';
            
            html += '</div>';
        });
        
        diffResults.innerHTML = html;
    }
    
    // Display unified diff
    function displayUnifiedDiff(diff) {
        let html = '';
        
        diff.forEach(line => {
            let lineClass = 'unified-context';
            let lineContent = line;
            
            if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
                lineClass = 'unified-header';
            } else if (line.startsWith('+')) {
                lineClass = 'unified-add';
            } else if (line.startsWith('-')) {
                lineClass = 'unified-remove';
            }
            
            html += '<div class="unified-line ' + lineClass + '">';
            html += escapeHtml(lineContent);
            html += '</div>';
        });
        
        diffResults.innerHTML = html;
    }
    
    // Clear all
    clearBtn.addEventListener('click', function() {
        text1.value = '';
        text2.value = '';
        updateLineCounts();
        statsSection.style.display = 'none';
        diffSection.style.display = 'none';
        diffResults.innerHTML = '';
    });
    
    // Swap texts
    swapBtn.addEventListener('click', function() {
        const temp = text1.value;
        text1.value = text2.value;
        text2.value = temp;
        updateLineCounts();
        
        // If results are shown, re-compare
        if (diffSection.style.display === 'block') {
            compareBtn.click();
        }
    });
    
    // Copy diff
    copyDiffBtn.addEventListener('click', function() {
        const diffText = diffResults.innerText;
        copyToClipboard(diffText, 'Diff copied to clipboard!');
    });
    
    // View mode change - auto re-compare if results are shown
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (diffSection.style.display === 'block') {
                compareBtn.click();
            }
        });
    });
    
    // Helper function to escape HTML
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
    
    // Helper function to copy to clipboard
    async function copyToClipboard(text, message) {
        try {
            await navigator.clipboard.writeText(text);
            showNotification(message, 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            showNotification('Failed to copy to clipboard', 'danger');
        }
    }
    
    // Show toast notification
    function showNotification(message, type = 'success') {
        const toastElement = document.getElementById('notificationToast');
        const toastHeader = toastElement.querySelector('.toast-header');
        const toastBody = toastElement.querySelector('.toast-body');
        
        // Reset classes
        toastHeader.className = 'toast-header';
        
        if (type === 'success') {
            toastHeader.classList.add('bg-success', 'text-white');
            toastHeader.querySelector('i').className = 'bi bi-check-circle me-2';
            toastHeader.querySelector('strong').textContent = 'Success';
            toastHeader.querySelector('.btn-close').className = 'btn-close btn-close-white';
        } else if (type === 'danger') {
            toastHeader.classList.add('bg-danger', 'text-white');
            toastHeader.querySelector('i').className = 'bi bi-exclamation-circle me-2';
            toastHeader.querySelector('strong').textContent = 'Error';
            toastHeader.querySelector('.btn-close').className = 'btn-close btn-close-white';
        } else if (type === 'warning') {
            toastHeader.classList.add('bg-warning', 'text-dark');
            toastHeader.querySelector('i').className = 'bi bi-exclamation-triangle me-2';
            toastHeader.querySelector('strong').textContent = 'Warning';
            toastHeader.querySelector('.btn-close').className = 'btn-close';
        }
        
        toastBody.textContent = message;
        toast.show();
    }
    
    // Keyboard shortcut - Ctrl/Cmd + Enter to compare
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            compareBtn.click();
        }
    });
});

