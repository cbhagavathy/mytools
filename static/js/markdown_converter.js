// Markdown Converter JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const markdownInput = document.getElementById('markdownInput');
    const previewContent = document.getElementById('previewContent');
    const htmlOutput = document.getElementById('htmlOutput');
    const htmlSourceSection = document.getElementById('htmlSourceSection');
    
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');
    const copyRenderedBtn = document.getElementById('copyRenderedBtn');
    
    const toast = new bootstrap.Toast(document.getElementById('copyToast'));

    // Convert button click handler
    convertBtn.addEventListener('click', async function() {
        const markdownText = markdownInput.value.trim();
        
        if (!markdownText) {
            previewContent.innerHTML = `
                <div class="text-muted text-center py-5">
                    <i class="bi bi-exclamation-circle display-1"></i>
                    <p class="mt-3">Please enter some Markdown content to convert</p>
                </div>
            `;
            return;
        }

        // Show loading state
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Converting...';

        try {
            const response = await fetch('/api/convert-markdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ markdown: markdownText })
            });

            const data = await response.json();

            if (data.success) {
                // Update preview
                previewContent.innerHTML = data.html;
                
                // Update HTML source
                htmlOutput.value = data.html;
                
                // Show HTML source section
                htmlSourceSection.style.display = 'block';
                
                // Enable copy buttons
                copyHtmlBtn.disabled = false;
                copyRenderedBtn.disabled = false;
            } else {
                previewContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> Error converting Markdown
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error:', error);
            previewContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error: ${error.message}
                </div>
            `;
        } finally {
            // Reset button state
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Convert';
        }
    });

    // Clear button click handler
    clearBtn.addEventListener('click', function() {
        markdownInput.value = '';
        previewContent.innerHTML = `
            <div class="text-muted text-center py-5">
                <i class="bi bi-arrow-left-circle display-1"></i>
                <p class="mt-3">Enter Markdown text and click "Convert" to see the preview</p>
            </div>
        `;
        htmlOutput.value = '';
        htmlSourceSection.style.display = 'none';
        copyHtmlBtn.disabled = true;
        copyRenderedBtn.disabled = true;
    });

    // Copy HTML button click handler
    copyHtmlBtn.addEventListener('click', async function() {
        const htmlText = htmlOutput.value;
        
        try {
            await navigator.clipboard.writeText(htmlText);
            showToast('HTML source copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback method
            htmlOutput.select();
            document.execCommand('copy');
            showToast('HTML source copied to clipboard!');
        }
    });

    // Copy Rendered button click handler
    copyRenderedBtn.addEventListener('click', async function() {
        const range = document.createRange();
        range.selectNodeContents(previewContent);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            // Try to copy the rich formatted content
            document.execCommand('copy');
            selection.removeAllRanges();
            showToast('Rendered content copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            showToast('Failed to copy rendered content', 'error');
        }
    });

    // Show toast notification
    function showToast(message, type = 'success') {
        const toastElement = document.getElementById('copyToast');
        const toastHeader = toastElement.querySelector('.toast-header');
        const toastBody = toastElement.querySelector('.toast-body');
        
        if (type === 'success') {
            toastHeader.className = 'toast-header bg-success text-white';
            toastHeader.querySelector('i').className = 'bi bi-check-circle me-2';
            toastHeader.querySelector('strong').textContent = 'Success';
        } else {
            toastHeader.className = 'toast-header bg-danger text-white';
            toastHeader.querySelector('i').className = 'bi bi-exclamation-circle me-2';
            toastHeader.querySelector('strong').textContent = 'Error';
        }
        
        toastBody.textContent = message;
        toast.show();
    }

    // Allow keyboard shortcut for conversion (Ctrl+Enter or Cmd+Enter)
    markdownInput.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            convertBtn.click();
        }
    });
});

