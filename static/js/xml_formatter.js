// XML Formatter JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const xmlInput = document.getElementById('xmlInput');
    const xmlOutput = document.getElementById('xmlOutput');
    const xmlOutputHighlighted = document.getElementById('xmlOutputHighlighted');
    const xmlOutputCode = document.getElementById('xmlOutputCode');
    const xmlTreeView = document.getElementById('xmlTreeView');
    const xmlTreeContent = document.getElementById('xmlTreeContent');
    const indentSize = document.getElementById('indentSize');
    
    const formatBtn = document.getElementById('formatBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    
    const textViewMode = document.getElementById('textViewMode');
    const treeViewMode = document.getElementById('treeViewMode');
    
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const treeControls = document.getElementById('treeControls');
    
    const searchInput = document.getElementById('searchInput');
    const searchPrevBtn = document.getElementById('searchPrevBtn');
    const searchNextBtn = document.getElementById('searchNextBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsBadge = document.getElementById('searchResultsBadge');
    const searchResultsText = document.getElementById('searchResultsText');
    
    const floatingCopyBtn = document.getElementById('floatingCopyBtn');
    
    const outputFooter = document.getElementById('outputFooter');
    const outputMessage = document.getElementById('outputMessage');
    const statsSection = document.getElementById('statsSection');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    
    let currentTreeData = null;
    let searchMatches = [];
    let currentMatchIndex = -1;
    let selectedText = '';

    // Format button click handler
    formatBtn.addEventListener('click', async function() {
        const xmlText = xmlInput.value.trim();
        
        if (!xmlText) {
            showNotification('Please enter XML content to format', 'warning');
            return;
        }

        // Show loading state
        formatBtn.disabled = true;
        formatBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Formatting...';

        try {
            const response = await fetch('/api/format-xml', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    xml: xmlText,
                    indent: parseInt(indentSize.value),
                    generate_tree: true
                })
            });

            const data = await response.json();

            if (data.success) {
                xmlOutput.value = data.formatted;
                
                // Update syntax highlighted version
                xmlOutputCode.textContent = data.formatted;
                Prism.highlightElement(xmlOutputCode);
                
                outputFooter.style.display = 'block';
                outputMessage.textContent = data.message;
                copyBtn.disabled = false;
                
                // Store tree data
                if (data.tree) {
                    currentTreeData = data.tree;
                    renderTree(data.tree);
                }
                
                // Update statistics
                updateStatistics(data.formatted);
                statsSection.style.display = 'block';
                
                showNotification('XML formatted successfully!', 'success');
            } else {
                xmlOutput.value = '';
                currentTreeData = null;
                outputFooter.style.display = 'block';
                outputMessage.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle"></i> ' + data.message + ': ' + data.error + '</span>';
                copyBtn.disabled = true;
                statsSection.style.display = 'none';
                
                showNotification(data.message + ': ' + data.error, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error: ' + error.message, 'danger');
        } finally {
            // Reset button state
            formatBtn.disabled = false;
            formatBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Format';
        }
    });

    // Minify button click handler
    minifyBtn.addEventListener('click', function() {
        const xmlText = xmlInput.value.trim();
        
        if (!xmlText) {
            showNotification('Please enter XML content to minify', 'warning');
            return;
        }

        try {
            // Remove extra whitespace and newlines
            const minified = xmlText
                .replace(/>\s+</g, '><')
                .replace(/\s+/g, ' ')
                .trim();
            
            xmlOutput.value = minified;
            outputFooter.style.display = 'block';
            outputMessage.textContent = 'XML minified successfully';
            copyBtn.disabled = false;
            
            // Update statistics
            updateStatistics(minified);
            statsSection.style.display = 'block';
            
            showNotification('XML minified successfully!', 'success');
        } catch (error) {
            showNotification('Error minifying XML: ' + error.message, 'danger');
        }
    });

    // Clear button click handler
    clearBtn.addEventListener('click', function() {
        xmlInput.value = '';
        xmlOutput.value = '';
        xmlOutputCode.textContent = '';
        xmlTreeContent.innerHTML = `
            <div class="text-muted text-center py-5">
                <i class="bi bi-diagram-3 display-1"></i>
                <p class="mt-3">Format XML to see tree structure</p>
            </div>
        `;
        currentTreeData = null;
        outputFooter.style.display = 'none';
        statsSection.style.display = 'none';
        copyBtn.disabled = true;
    });
    
    // View mode toggle
    textViewMode.addEventListener('change', function() {
        if (this.checked) {
            xmlOutputHighlighted.style.display = 'block';
            xmlTreeView.style.display = 'none';
            treeControls.style.display = 'none';
        }
    });
    
    treeViewMode.addEventListener('change', function() {
        if (this.checked) {
            xmlOutputHighlighted.style.display = 'none';
            xmlTreeView.style.display = 'block';
            if (currentTreeData) {
                treeControls.style.display = 'flex';
                renderTree(currentTreeData);
            }
        }
    });
    
    // Expand All button
    expandAllBtn.addEventListener('click', function() {
        const allToggles = xmlTreeContent.querySelectorAll('.tree-toggle.collapsed');
        allToggles.forEach(toggle => {
            const node = toggle.parentElement;
            const parentDiv = node.parentElement;
            const children = parentDiv.querySelector('.tree-children');
            
            if (children) {
                children.classList.remove('collapsed');
                toggle.classList.remove('collapsed');
                toggle.classList.add('expanded');
            }
        });
        showNotification('All nodes expanded', 'success');
    });
    
    // Collapse All button
    collapseAllBtn.addEventListener('click', function() {
        const allToggles = xmlTreeContent.querySelectorAll('.tree-toggle:not(.leaf)');
        allToggles.forEach(toggle => {
            const node = toggle.parentElement;
            const parentDiv = node.parentElement;
            const children = parentDiv.querySelector('.tree-children');
            
            if (children && !children.classList.contains('collapsed')) {
                children.classList.add('collapsed');
                toggle.classList.remove('expanded');
                toggle.classList.add('collapsed');
            }
        });
        showNotification('All nodes collapsed', 'success');
    });

    // Copy button click handler
    copyBtn.addEventListener('click', async function() {
        const formattedXml = xmlOutput.value || xmlOutputCode.textContent;
        
        try {
            await navigator.clipboard.writeText(formattedXml);
            showNotification('Formatted XML copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback method
            xmlOutput.select();
            document.execCommand('copy');
            showNotification('Formatted XML copied to clipboard!', 'success');
        }
    });

    // Update statistics
    function updateStatistics(xmlText) {
        const lines = xmlText.split('\n').length;
        const chars = xmlText.length;
        const sizeKB = (new Blob([xmlText]).size / 1024).toFixed(2);
        const elements = (xmlText.match(/<[^\/][^>]*>/g) || []).length;
        
        document.getElementById('lineCount').textContent = lines;
        document.getElementById('charCount').textContent = chars.toLocaleString();
        document.getElementById('sizeKB').textContent = sizeKB;
        document.getElementById('elementCount').textContent = '~' + elements;
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

    // Allow keyboard shortcut for formatting (Ctrl+Enter or Cmd+Enter)
    xmlInput.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            formatBtn.click();
        }
    });
    
    // Render XML tree structure
    function renderTree(node) {
        xmlTreeContent.innerHTML = '';
        const treeHtml = buildTreeNode(node, 0);
        xmlTreeContent.innerHTML = treeHtml;
        
        // Add event listeners for toggle buttons
        attachTreeEventListeners();
    }
    
    // Build tree node HTML - Simple style
    function buildTreeNode(node, level) {
        const hasChildren = node.children && node.children.length > 0;
        const hasText = node.text && node.text.trim() !== '';
        const hasAttributes = Object.keys(node.attributes).length > 0;
        
        let html = '<div>';
        
        // If this is a simple element with only text content (no children, no attributes)
        if (hasText && !hasChildren && !hasAttributes) {
            // Show as single line: <tag>content</tag>
            html += '<div class="tree-node tree-node-inline">';
            html += '<span class="tree-toggle leaf"></span>';
            html += '<span class="tree-tag-bracket">&lt;</span>';
            html += '<span class="tree-element-name">' + escapeHtml(node.name) + '</span>';
            html += '<span class="tree-tag-bracket">&gt;</span>';
            html += '<span class="tree-text-content">' + escapeHtml(node.text) + '</span>';
            html += '<span class="tree-tag-bracket">&lt;/</span>';
            html += '<span class="tree-element-name">' + escapeHtml(node.name) + '</span>';
            html += '<span class="tree-tag-bracket">&gt;</span>';
            html += '</div>';
        } else {
            // Node line with toggle
            html += '<div class="tree-node">';
            
            // Toggle arrow
            if (hasChildren || hasAttributes) {
                html += '<span class="tree-toggle expanded"></span>';
            } else {
                html += '<span class="tree-toggle leaf"></span>';
            }
            
            // Element name
            html += '<span class="tree-tag-bracket">&lt;</span>';
            html += '<span class="tree-element-name">' + escapeHtml(node.name) + '</span>';
            html += '<span class="tree-tag-bracket">&gt;</span>';
            
            // Count of children/attributes
            const itemCount = (hasChildren ? node.children.length : 0) + (hasAttributes ? Object.keys(node.attributes).length : 0);
            if (itemCount > 0) {
                html += ' <span class="tree-count">{' + itemCount + '}</span>';
            }
            
            html += '</div>';
            
            // Children container
            if (hasAttributes || hasChildren) {
                html += '<div class="tree-children">';
                
                // Attributes on separate lines
                if (hasAttributes) {
                    for (const [attrName, attrValue] of Object.entries(node.attributes)) {
                        html += '<div class="tree-node">';
                        html += '<span class="tree-toggle leaf"></span>';
                        html += '<span class="tree-attribute-name">@' + escapeHtml(attrName) + '</span>: ';
                        html += '<span class="tree-attribute-value">' + escapeHtml(attrValue) + '</span>';
                        html += '</div>';
                    }
                }
                
                // Child elements
                if (hasChildren) {
                    for (const child of node.children) {
                        html += buildTreeNode(child, level + 1);
                    }
                }
                
                html += '</div>';
            }
        }
        
        html += '</div>';
        
        return html;
    }
    
    // Attach event listeners to tree toggle buttons
    function attachTreeEventListeners() {
        // Only attach click handlers to toggle arrows, not the entire node
        const toggles = xmlTreeContent.querySelectorAll('.tree-toggle:not(.leaf)');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const parentDiv = this.closest('.tree-node').parentElement;
                const children = parentDiv.querySelector('.tree-children');
                
                if (children) {
                    if (children.classList.contains('collapsed')) {
                        children.classList.remove('collapsed');
                        toggle.classList.remove('collapsed');
                        toggle.classList.add('expanded');
                    } else {
                        children.classList.add('collapsed');
                        toggle.classList.remove('expanded');
                        toggle.classList.add('collapsed');
                    }
                }
            });
            
            // Prevent text selection on the toggle itself
            toggle.addEventListener('mousedown', function(e) {
                e.preventDefault();
            });
        });
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
    
    // ========== SEARCH FUNCTIONALITY ==========
    
    // Search input handler
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        if (searchTerm.length === 0) {
            clearSearch();
            return;
        }
        
        if (searchTerm.length < 2) {
            return; // Wait for at least 2 characters
        }
        
        performSearch(searchTerm);
    });
    
    // Clear search button
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearSearch();
    });
    
    // Search navigation buttons
    searchPrevBtn.addEventListener('click', function() {
        navigateSearch(-1);
    });
    
    searchNextBtn.addEventListener('click', function() {
        navigateSearch(1);
    });
    
    // Keyboard shortcuts for search
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                navigateSearch(-1); // Shift+Enter: previous
            } else {
                navigateSearch(1); // Enter: next
            }
        } else if (e.key === 'Escape') {
            clearSearch();
            searchInput.blur();
        }
    });
    
    // Perform search
    function performSearch(searchTerm) {
        const isTreeView = treeViewMode.checked;
        
        if (isTreeView) {
            searchInTree(searchTerm);
        } else {
            searchInText(searchTerm);
        }
    }
    
    // Search in text view
    function searchInText(searchTerm) {
        clearSearchHighlights();
        searchMatches = [];
        currentMatchIndex = -1;
        
        const content = xmlOutputCode.textContent;
        if (!content) return;
        
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            searchMatches.push({
                index: match.index,
                length: searchTerm.length
            });
        }
        
        if (searchMatches.length > 0) {
            highlightTextMatches(content, searchTerm);
            currentMatchIndex = 0;
            updateSearchUI();
            scrollToMatch(0);
        } else {
            updateSearchUI();
            showNotification('No matches found', 'warning');
        }
    }
    
    // Highlight matches in text view
    function highlightTextMatches(content, searchTerm) {
        // First, ensure the content is properly highlighted by Prism
        if (!xmlOutputCode.classList.contains('language-xml')) {
            xmlOutputCode.className = 'language-xml';
        }
        
        // Get all text nodes and their positions
        const textNodes = [];
        const walker = document.createTreeWalker(
            xmlOutputCode,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        let offset = 0;
        while (node = walker.nextNode()) {
            textNodes.push({
                node: node,
                start: offset,
                end: offset + node.textContent.length,
                text: node.textContent
            });
            offset += node.textContent.length;
        }
        
        // Find all matches and wrap them
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        let match;
        const matches = [];
        
        while ((match = regex.exec(content)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + searchTerm.length
            });
        }
        
        // Apply highlights to text nodes
        matches.reverse().forEach((match, matchIndex) => {
            // Find which text node(s) contain this match
            for (let i = 0; i < textNodes.length; i++) {
                const textNode = textNodes[i];
                
                // Check if match overlaps with this text node
                if (match.start < textNode.end && match.end > textNode.start) {
                    const startInNode = Math.max(0, match.start - textNode.start);
                    const endInNode = Math.min(textNode.node.textContent.length, match.end - textNode.start);
                    
                    // Split the text node and wrap the match
                    const nodeText = textNode.node.textContent;
                    const before = nodeText.substring(0, startInNode);
                    const matchText = nodeText.substring(startInNode, endInNode);
                    const after = nodeText.substring(endInNode);
                    
                    // Create mark element
                    const mark = document.createElement('mark');
                    mark.className = 'search-highlight';
                    mark.textContent = matchText;
                    
                    // Create document fragment to replace the text node
                    const fragment = document.createDocumentFragment();
                    if (before) fragment.appendChild(document.createTextNode(before));
                    fragment.appendChild(mark);
                    if (after) fragment.appendChild(document.createTextNode(after));
                    
                    // Replace the text node
                    textNode.node.parentNode.replaceChild(fragment, textNode.node);
                    
                    // Only process the first occurrence in this node
                    break;
                }
            }
        });
    }
    
    // Search in tree view
    function searchInTree(searchTerm) {
        clearSearchHighlights();
        searchMatches = [];
        currentMatchIndex = -1;
        
        const allNodes = xmlTreeContent.querySelectorAll('.tree-node');
        const regex = new RegExp(escapeRegExp(searchTerm), 'i');
        
        allNodes.forEach((node, index) => {
            const text = node.textContent;
            if (regex.test(text)) {
                searchMatches.push(node);
                node.classList.add('tree-search-match');
                
                // Expand parent nodes to show this match
                let parent = node.parentElement;
                while (parent && parent !== xmlTreeContent) {
                    if (parent.classList.contains('tree-children')) {
                        parent.classList.remove('collapsed');
                        // Update toggle icon
                        const prevSibling = parent.previousElementSibling;
                        if (prevSibling) {
                            const toggle = prevSibling.querySelector('.tree-toggle');
                            if (toggle) {
                                toggle.classList.remove('collapsed');
                                toggle.classList.add('expanded');
                            }
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        });
        
        if (searchMatches.length > 0) {
            currentMatchIndex = 0;
            highlightCurrentMatch();
            updateSearchUI();
            scrollToTreeMatch();
        } else {
            updateSearchUI();
            showNotification('No matches found', 'warning');
        }
    }
    
    // Navigate search results
    function navigateSearch(direction) {
        if (searchMatches.length === 0) return;
        
        const isTreeView = treeViewMode.checked;
        
        // Remove current highlight
        if (isTreeView && currentMatchIndex >= 0) {
            searchMatches[currentMatchIndex].classList.remove('tree-search-current');
        }
        
        // Update index
        currentMatchIndex += direction;
        
        // Wrap around
        if (currentMatchIndex < 0) {
            currentMatchIndex = searchMatches.length - 1;
        } else if (currentMatchIndex >= searchMatches.length) {
            currentMatchIndex = 0;
        }
        
        // Highlight and scroll
        if (isTreeView) {
            highlightCurrentMatch();
            scrollToTreeMatch();
        } else {
            scrollToMatch(currentMatchIndex);
        }
        
        updateSearchUI();
    }
    
    // Highlight current match in tree
    function highlightCurrentMatch() {
        searchMatches.forEach((node, index) => {
            if (index === currentMatchIndex) {
                node.classList.add('tree-search-current');
            } else {
                node.classList.remove('tree-search-current');
            }
        });
    }
    
    // Scroll to current match in text view
    function scrollToMatch(index) {
        const marks = xmlOutputCode.querySelectorAll('.search-highlight');
        if (marks[index]) {
            // Update current highlight
            marks.forEach((mark, i) => {
                if (i === index) {
                    mark.className = 'search-highlight-current';
                } else {
                    mark.className = 'search-highlight';
                }
            });
            
            marks[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // Scroll to current match in tree view
    function scrollToTreeMatch() {
        if (currentMatchIndex >= 0 && searchMatches[currentMatchIndex]) {
            searchMatches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // Update search UI
    function updateSearchUI() {
        if (searchMatches.length > 0) {
            searchResultsText.textContent = `${currentMatchIndex + 1} / ${searchMatches.length}`;
            searchResultsBadge.style.display = 'inline-block';
            searchPrevBtn.disabled = false;
            searchNextBtn.disabled = false;
            clearSearchBtn.disabled = false;
        } else if (searchInput.value.trim().length >= 2) {
            searchResultsText.textContent = '0 / 0';
            searchResultsBadge.style.display = 'inline-block';
            searchPrevBtn.disabled = true;
            searchNextBtn.disabled = true;
            clearSearchBtn.disabled = false;
        } else {
            searchResultsBadge.style.display = 'none';
            searchPrevBtn.disabled = true;
            searchNextBtn.disabled = true;
            clearSearchBtn.disabled = true;
        }
    }
    
    // Clear search
    function clearSearch() {
        clearSearchHighlights();
        searchMatches = [];
        currentMatchIndex = -1;
        updateSearchUI();
    }
    
    // Clear search highlights
    function clearSearchHighlights() {
        // Clear tree view highlights
        const treeMatches = xmlTreeContent.querySelectorAll('.tree-search-match, .tree-search-current');
        treeMatches.forEach(node => {
            node.classList.remove('tree-search-match', 'tree-search-current');
        });
        
        // For text view, check if there are any marks
        const marks = xmlOutputCode.querySelectorAll('.search-highlight, .search-highlight-current');
        if (marks.length > 0) {
            // Re-apply Prism highlighting from scratch to remove marks
            const originalContent = xmlOutput.value; // Get from hidden textarea
            xmlOutputCode.textContent = originalContent;
            Prism.highlightElement(xmlOutputCode);
        }
    }
    
    // Escape regex special characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Clear search when switching views
    textViewMode.addEventListener('change', function() {
        if (searchInput.value) {
            performSearch(searchInput.value);
        }
    });
    
    treeViewMode.addEventListener('change', function() {
        if (searchInput.value) {
            performSearch(searchInput.value);
        }
    });
    
    // ========== TEXT SELECTION & COPY FUNCTIONALITY ==========
    
    // Track text selection in output areas
    function handleTextSelection(event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
            // Check if selection is within our output areas
            const outputArea = document.getElementById('xmlOutputHighlighted');
            const treeArea = document.getElementById('xmlTreeView');
            
            let isInOutputArea = false;
            let node = selection.anchorNode;
            
            while (node) {
                if (node === outputArea || node === treeArea) {
                    isInOutputArea = true;
                    break;
                }
                node = node.parentNode;
            }
            
            if (isInOutputArea) {
                showFloatingCopyButton(event, selectedText);
            } else {
                hideFloatingCopyButton();
            }
        } else {
            hideFloatingCopyButton();
        }
    }
    
    // Show floating copy button near selection
    function showFloatingCopyButton(event, text) {
        selectedText = text;
        
        // Get selection position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Position the button above the selection
            const buttonWidth = 150;
            const buttonHeight = 40;
            
            let left = rect.left + (rect.width / 2) - (buttonWidth / 2);
            let top = rect.top - buttonHeight - 10;
            
            // Ensure button stays within viewport
            if (left < 10) left = 10;
            if (left + buttonWidth > window.innerWidth - 10) {
                left = window.innerWidth - buttonWidth - 10;
            }
            
            if (top < 10) {
                // If not enough space above, show below
                top = rect.bottom + 10;
            }
            
            floatingCopyBtn.style.left = left + window.scrollX + 'px';
            floatingCopyBtn.style.top = top + window.scrollY + 'px';
            floatingCopyBtn.style.display = 'block';
        }
    }
    
    // Hide floating copy button
    function hideFloatingCopyButton() {
        floatingCopyBtn.style.display = 'none';
        selectedText = '';
    }
    
    // Copy selected text
    floatingCopyBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (selectedText) {
            try {
                await navigator.clipboard.writeText(selectedText);
                
                // Visual feedback
                const originalHTML = floatingCopyBtn.innerHTML;
                floatingCopyBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
                floatingCopyBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                
                setTimeout(() => {
                    floatingCopyBtn.innerHTML = originalHTML;
                    floatingCopyBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    hideFloatingCopyButton();
                }, 1500);
                
                showNotification('Selection copied to clipboard!', 'success');
            } catch (err) {
                showNotification('Failed to copy selection', 'error');
                console.error('Copy failed:', err);
            }
        }
    });
    
    // Listen for text selection events
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', function() {
        // Debounce to avoid too many calls
        clearTimeout(this.selectionTimeout);
        this.selectionTimeout = setTimeout(() => {
            const selection = window.getSelection();
            if (selection.toString().trim().length === 0) {
                hideFloatingCopyButton();
            }
        }, 100);
    });
    
    // Hide button when clicking outside
    document.addEventListener('mousedown', function(e) {
        if (e.target !== floatingCopyBtn && !floatingCopyBtn.contains(e.target)) {
            // Don't hide immediately if clicking in selection area
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.toString().trim().length === 0) {
                    hideFloatingCopyButton();
                }
            }, 10);
        }
    });
    
    // Hide button when scrolling
    document.querySelector('.code-display')?.addEventListener('scroll', function() {
        if (floatingCopyBtn.style.display === 'block') {
            const selection = window.getSelection();
            if (selection.toString().trim().length > 0) {
                // Update position on scroll
                const event = { clientX: 0, clientY: 0 };
                const text = selection.toString().trim();
                if (text) {
                    showFloatingCopyButton(event, text);
                }
            } else {
                hideFloatingCopyButton();
            }
        }
    });
    
    document.querySelector('.xml-tree-container')?.addEventListener('scroll', function() {
        if (floatingCopyBtn.style.display === 'block') {
            const selection = window.getSelection();
            if (selection.toString().trim().length > 0) {
                const event = { clientX: 0, clientY: 0 };
                const text = selection.toString().trim();
                if (text) {
                    showFloatingCopyButton(event, text);
                }
            } else {
                hideFloatingCopyButton();
            }
        }
    });
    
    // Keyboard shortcut support (Ctrl+C / Cmd+C works naturally with selectable text)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText.length > 0) {
                // Let native copy work, but show notification
                setTimeout(() => {
                    const outputArea = document.getElementById('xmlOutputHighlighted');
                    const treeArea = document.getElementById('xmlTreeView');
                    
                    let node = selection.anchorNode;
                    let isInOutputArea = false;
                    
                    while (node) {
                        if (node === outputArea || node === treeArea) {
                            isInOutputArea = true;
                            break;
                        }
                        node = node.parentNode;
                    }
                    
                    if (isInOutputArea) {
                        showNotification('Selection copied to clipboard!', 'success');
                    }
                }, 100);
            }
        } else if (e.key === 'Escape') {
            hideFloatingCopyButton();
            window.getSelection().removeAllRanges();
        }
    });
});

