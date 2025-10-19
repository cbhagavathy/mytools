document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sqlInput = document.getElementById('sqlInput');
    const sqlOutput = document.getElementById('sqlOutput');
    const sqlOutputCode = document.getElementById('sqlOutputCode');
    const sqlOutputHighlighted = document.getElementById('sqlOutputHighlighted');
    
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    
    const keywordCase = document.getElementById('keywordCase');
    const indentSize = document.getElementById('indentSize');
    const breakBeforeComma = document.getElementById('breakBeforeComma');
    
    const outputFooter = document.getElementById('outputFooter');
    const outputMessage = document.getElementById('outputMessage');
    
    const lineCount = document.getElementById('lineCount');
    const charCount = document.getElementById('charCount');
    const keywordCount = document.getElementById('keywordCount');
    const tableCount = document.getElementById('tableCount');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    // SQL Keywords (Oracle optimized)
    const sqlKeywords = [
        'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
        'TABLE', 'INDEX', 'VIEW', 'SEQUENCE', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'PACKAGE',
        'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'USING',
        'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
        'ORDER', 'BY', 'GROUP', 'HAVING', 'DISTINCT', 'UNION', 'ALL', 'INTERSECT', 'MINUS',
        'AS', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'BEGIN', 'END', 'IF', 'THEN', 'ELSIF', 'ELSE', 'LOOP', 'WHILE', 'FOR',
        'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'GRANT', 'REVOKE',
        'VARCHAR2', 'NUMBER', 'DATE', 'TIMESTAMP', 'CLOB', 'BLOB', 'ROWNUM', 'DUAL',
        'CONNECT', 'START', 'WITH', 'PRIOR', 'LEVEL'
    ];
    
    // Format button click
    formatBtn.addEventListener('click', function() {
        const sql = sqlInput.value.trim();
        
        if (!sql) {
            showNotification('Please enter SQL query', 'warning');
            return;
        }
        
        const formatted = formatSQL(sql);
        sqlOutput.value = formatted;
        sqlOutputCode.textContent = formatted;
        
        // Apply syntax highlighting
        Prism.highlightElement(sqlOutputCode);
        
        updateStatistics(formatted);
        outputFooter.style.display = 'block';
        showNotification('SQL formatted successfully!', 'success');
    });
    
    // Minify button click
    minifyBtn.addEventListener('click', function() {
        const sql = sqlInput.value.trim();
        
        if (!sql) {
            showNotification('Please enter SQL query', 'warning');
            return;
        }
        
        const minified = minifySQL(sql);
        sqlOutput.value = minified;
        sqlOutputCode.textContent = minified;
        
        Prism.highlightElement(sqlOutputCode);
        
        updateStatistics(minified);
        outputFooter.style.display = 'block';
        outputMessage.textContent = 'SQL minified successfully';
        showNotification('SQL minified successfully!', 'success');
    });
    
    // Clear button click
    clearBtn.addEventListener('click', function() {
        sqlInput.value = '';
        sqlOutput.value = '';
        sqlOutputCode.textContent = '<!-- Formatted SQL will appear here... -->';
        outputFooter.style.display = 'none';
        updateStatistics('');
        showNotification('Cleared', 'info');
    });
    
    // Copy button click
    copyBtn.addEventListener('click', async function() {
        const sql = sqlOutput.value;
        
        if (!sql) {
            showNotification('No formatted SQL to copy', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(sql);
            showNotification('Formatted SQL copied to clipboard!', 'success');
        } catch (err) {
            showNotification('Failed to copy SQL', 'error');
        }
    });
    
    // Format SQL function
    function formatSQL(sql) {
        const caseOption = keywordCase.value;
        const indent = indentSize.value === 'tab' ? '\t' : ' '.repeat(parseInt(indentSize.value));
        const commaBreak = breakBeforeComma.checked;
        
        // Remove extra whitespace
        sql = sql.replace(/\s+/g, ' ').trim();
        
        // Apply keyword casing
        let formatted = sql;
        sqlKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            formatted = formatted.replace(regex, match => {
                if (caseOption === 'upper') return match.toUpperCase();
                if (caseOption === 'lower') return match.toLowerCase();
                return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
            });
        });
        
        // Format major clauses
        formatted = formatted
            .replace(/\b(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|UNION|INTERSECT|MINUS)\b/gi, '\n$1')
            .replace(/\b(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN|CROSS JOIN|JOIN)\b/gi, '\n$1')
            .replace(/\b(AND|OR)\b/gi, '\n  $1')
            .replace(/\b(ON)\b/gi, '\n    $1');
        
        // Handle SELECT columns
        if (commaBreak) {
            formatted = formatted.replace(/,\s*(?=[^\s])/g, '\n  ,');
        } else {
            formatted = formatted.replace(/,\s*/g, ', ');
        }
        
        // Handle parentheses
        formatted = formatted
            .replace(/\(/g, '(\n  ')
            .replace(/\)/g, '\n)');
        
        // Apply indentation
        const lines = formatted.split('\n');
        let indentLevel = 0;
        const formattedLines = lines.map(line => {
            line = line.trim();
            
            if (!line) return '';
            
            // Decrease indent for closing parentheses
            if (line.startsWith(')')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            const indentedLine = indent.repeat(indentLevel) + line;
            
            // Increase indent for opening parentheses
            if (line.includes('(') && !line.includes(')')) {
                indentLevel++;
            }
            
            // Handle major keywords
            if (/^(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|UNION|INTERSECT|MINUS|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN)/i.test(line)) {
                return indentedLine;
            }
            
            return indentedLine;
        });
        
        // Clean up and remove excessive blank lines
        formatted = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        
        return formatted;
    }
    
    // Minify SQL function
    function minifySQL(sql) {
        return sql
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',')
            .replace(/\s*\(\s*/g, '(')
            .replace(/\s*\)\s*/g, ')')
            .replace(/\s*=\s*/g, '=')
            .trim();
    }
    
    // Update statistics
    function updateStatistics(sql) {
        if (!sql) {
            lineCount.textContent = '0';
            charCount.textContent = '0';
            keywordCount.textContent = '0';
            tableCount.textContent = '0';
            return;
        }
        
        // Line count
        const lines = sql.split('\n').length;
        lineCount.textContent = lines.toLocaleString();
        
        // Character count
        charCount.textContent = sql.length.toLocaleString();
        
        // Keyword count
        let keywords = 0;
        sqlKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = sql.match(regex);
            if (matches) keywords += matches.length;
        });
        keywordCount.textContent = keywords.toLocaleString();
        
        // Table count (rough estimate)
        const fromMatch = sql.match(/\bFROM\b/gi);
        const joinMatch = sql.match(/\bJOIN\b/gi);
        const tables = (fromMatch ? fromMatch.length : 0) + (joinMatch ? joinMatch.length : 0);
        tableCount.textContent = tables.toLocaleString();
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
    sqlInput.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to format
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            formatBtn.click();
        }
    });
    
    // Initialize statistics
    updateStatistics('');
});

