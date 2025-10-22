// PL/SQL Dynamic SQL Converter

let foundVariables = new Set();

document.addEventListener('DOMContentLoaded', function() {
    initializeConverter();
});

function initializeConverter() {
    document.getElementById('convertBtn').addEventListener('click', convertSQL);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('copyBtn').addEventListener('click', copyOutput);
    document.getElementById('downloadBtn').addEventListener('click', downloadSQL);
    document.getElementById('loadExampleBtn').addEventListener('click', loadExample);
    
    // Auto-convert when options change
    ['formatSql', 'uppercaseKeywords', 'removeComments', 'addSemicolon'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            const input = document.getElementById('plsqlInput').value.trim();
            if (input) {
                convertSQL();
            }
        });
    });
}

function loadExample() {
    const example = `v_sql := 'SELECT ' ||
         '    client_name, ' ||
         '    client_id, ' ||
         '    charge_offer_descr, ' ||
         '    NVL(list_price, 0), ' ||
         '    NVL(total_charge_amount, 0), ' ||
         '    NVL(total_discount, 0), ' ||
         '    NVL(total_tax_amount, 0), ' ||
         '    NVL(total_amount, 0) ' ||
         'FROM ' || i_tmp_summary_table ||
         'WHERE parent_id0 = ' || i_parent_bill_obj_id0;`;
    
    const variables = `i_tmp_summary_table = account_summary_tmp
i_parent_bill_obj_id0 = 12345`;
    
    document.getElementById('plsqlInput').value = example;
    document.getElementById('variableInput').value = variables;
    
    showToast('Example loaded! Click "Convert to SQL" to see the result.', 'info');
}

function convertSQL() {
    const input = document.getElementById('plsqlInput').value.trim();
    
    if (!input) {
        showToast('Please enter PL/SQL dynamic SQL code', 'warning');
        return;
    }
    
    try {
        // Get options
        const formatSql = document.getElementById('formatSql').checked;
        const uppercaseKeywords = document.getElementById('uppercaseKeywords').checked;
        const removeComments = document.getElementById('removeComments').checked;
        const addSemicolon = document.getElementById('addSemicolon').checked;
        
        // Parse variable substitutions
        const variableMap = parseVariableSubstitutions();
        
        // Convert
        let sql = extractSQL(input);
        
        // Apply options
        if (removeComments) {
            sql = removeCommentsFromSQL(sql);
        }
        
        if (formatSql) {
            sql = formatSQL(sql);
        }
        
        if (uppercaseKeywords) {
            sql = uppercaseSQLKeywords(sql);
        }
        
        // Apply variable substitutions
        sql = substituteVariables(sql, variableMap);
        
        if (addSemicolon && !sql.trim().endsWith(';')) {
            sql += ';';
        }
        
        // Display output
        document.getElementById('sqlOutput').value = sql;
        
        // Show variables found
        displayFoundVariables();
        
        // Show stats
        displayStats(input, sql);
        
        showToast('SQL converted successfully!', 'success');
        
    } catch (error) {
        showToast('Error converting SQL: ' + error.message, 'danger');
        console.error(error);
    }
}

function extractSQL(plsqlCode) {
    foundVariables.clear();
    
    // Remove leading variable assignment (e.g., "v_sql := ")
    let sql = plsqlCode.replace(/^\s*\w+\s*:=\s*/, '');
    
    // Remove trailing semicolon if present
    sql = sql.replace(/;\s*$/, '');
    
    // Split by concatenation operator ||
    const parts = sql.split(/\s*\|\|\s*/);
    
    let result = '';
    
    for (let part of parts) {
        part = part.trim();
        
        // Check if it's a string literal (enclosed in quotes)
        if ((part.startsWith("'") && part.endsWith("'")) || 
            (part.startsWith('"') && part.endsWith('"'))) {
            // Remove quotes and add to result
            let content = part.slice(1, -1);
            // Unescape doubled quotes
            content = content.replace(/''/g, "'").replace(/""/g, '"');
            result += content;
        } else {
            // It's a variable - replace with placeholder
            const varName = part.trim();
            foundVariables.add(varName);
            result += `<${varName}>`;
        }
    }
    
    return result.trim();
}

function parseVariableSubstitutions() {
    const input = document.getElementById('variableInput').value.trim();
    const variableMap = {};
    
    if (!input) return variableMap;
    
    const lines = input.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        const match = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (match) {
            const varName = match[1].trim();
            let value = match[2].trim();
            
            // Remove quotes if present
            if ((value.startsWith("'") && value.endsWith("'")) || 
                (value.startsWith('"') && value.endsWith('"'))) {
                value = value.slice(1, -1);
            }
            
            variableMap[varName] = value;
        }
    }
    
    return variableMap;
}

function substituteVariables(sql, variableMap) {
    let result = sql;
    
    // Replace each <variable> with its value from the map
    for (const [varName, value] of Object.entries(variableMap)) {
        const placeholder = `<${varName}>`;
        
        // Determine if value needs quotes (non-numeric)
        let substitution;
        if (/^\d+$/.test(value)) {
            substitution = value;
        } else {
            substitution = `'${value}'`;
        }
        
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), substitution);
    }
    
    return result;
}

function formatSQL(sql) {
    // Basic SQL formatting
    let formatted = sql;
    
    // Add newlines after major keywords
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 
                      'HAVING', 'UNION', 'INTERSECT', 'MINUS', 'JOIN', 'LEFT JOIN', 
                      'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN'];
    
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formatted = formatted.replace(regex, '\n' + keyword);
    });
    
    // Put each column on its own line (comma followed by newline)
    // Look for commas that are not inside parentheses
    formatted = formatColumnsOnSeparateLines(formatted);
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n+/g, '\n');
    
    // Trim and add proper indentation
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentSize = 4;
    let inSelectClause = false;
    
    formatted = lines.map(line => {
        line = line.trim();
        if (!line) return '';
        
        // Check if we're starting a SELECT clause
        if (/^SELECT\b/i.test(line)) {
            indentLevel = 0;
            inSelectClause = true;
            return line;
        }
        
        // Check if we're exiting SELECT clause
        if (/^(FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ORDER BY|GROUP BY|HAVING)\b/i.test(line)) {
            indentLevel = 0;
            inSelectClause = false;
            return line;
        }
        
        // If we're in SELECT clause or after WHERE/AND/OR, indent
        if (inSelectClause || /^(AND|OR)\b/i.test(line)) {
            indentLevel = 1;
        } else if (/^(WHERE)\b/i.test(line)) {
            indentLevel = 0;
        }
        
        const indent = ' '.repeat(indentLevel * indentSize);
        return indent + line;
    }).join('\n');
    
    return formatted;
}

function formatColumnsOnSeparateLines(sql) {
    // Split by newlines to process line by line
    const lines = sql.split('\n');
    const result = [];
    
    for (let line of lines) {
        // Check if this line contains SELECT or is part of column list
        if (/SELECT/i.test(line) || result.some(l => /SELECT/i.test(l))) {
            // Check if we've hit FROM, WHERE, etc. which ends column list
            if (/\b(FROM|WHERE|JOIN|ORDER BY|GROUP BY)\b/i.test(line)) {
                result.push(line);
                continue;
            }
            
            // Split by comma, but be smart about parentheses
            const columns = splitByCommaOutsideParentheses(line);
            
            if (columns.length > 1) {
                columns.forEach((col, idx) => {
                    col = col.trim();
                    if (col) {
                        // Add comma at the end if not the last column
                        if (idx < columns.length - 1) {
                            result.push(col + ',');
                        } else {
                            result.push(col);
                        }
                    }
                });
            } else {
                result.push(line);
            }
        } else {
            result.push(line);
        }
    }
    
    return result.join('\n');
}

function splitByCommaOutsideParentheses(text) {
    const result = [];
    let current = '';
    let parenthesesDepth = 0;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '(') {
            parenthesesDepth++;
            current += char;
        } else if (char === ')') {
            parenthesesDepth--;
            current += char;
        } else if (char === ',' && parenthesesDepth === 0) {
            // Found a comma outside parentheses
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last part
    if (current.trim()) {
        result.push(current.trim());
    }
    
    return result.length > 0 ? result : [text];
}

function uppercaseSQLKeywords(sql) {
    const keywords = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING',
        'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX',
        'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'FULL JOIN',
        'ON', 'UNION', 'INTERSECT', 'MINUS', 'AS', 'IN', 'NOT', 'NULL', 'IS',
        'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'DISTINCT', 'ALL', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'FETCH', 'FIRST',
        'NVL', 'DECODE', 'COALESCE', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
        'TO_CHAR', 'TO_DATE', 'TO_NUMBER', 'SUBSTR', 'TRIM', 'UPPER', 'LOWER'
    ];
    
    let result = sql;
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        result = result.replace(regex, keyword.toUpperCase());
    });
    
    return result;
}

function removeCommentsFromSQL(sql) {
    // Remove single-line comments (-- ...)
    let result = sql.replace(/--[^\n]*/g, '');
    
    // Remove multi-line comments (/* ... */)
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return result;
}

function displayFoundVariables() {
    const variablesDiv = document.getElementById('variablesFound');
    const variablesList = document.getElementById('variablesList');
    
    if (foundVariables.size > 0) {
        const variableMap = parseVariableSubstitutions();
        const unsubstituted = Array.from(foundVariables).filter(v => !variableMap[v]);
        
        if (unsubstituted.length > 0) {
            variablesList.innerHTML = '<code>' + unsubstituted.map(v => `&lt;${v}&gt;`).join(', ') + '</code>';
            variablesDiv.style.display = 'block';
        } else {
            variablesDiv.style.display = 'none';
        }
    } else {
        variablesDiv.style.display = 'none';
    }
}

function displayStats(input, output) {
    const statsDiv = document.getElementById('statsInfo');
    const statsList = document.getElementById('statsList');
    
    const inputLines = input.split('\n').length;
    const outputLines = output.split('\n').length;
    const concatCount = (input.match(/\|\|/g) || []).length;
    const variableCount = foundVariables.size;
    
    statsList.innerHTML = `
        <li>Input lines: <strong>${inputLines}</strong></li>
        <li>Output lines: <strong>${outputLines}</strong></li>
        <li>Concatenation operators removed: <strong>${concatCount}</strong></li>
        <li>Variables found: <strong>${variableCount}</strong></li>
    `;
    
    statsDiv.style.display = 'block';
}

function copyOutput() {
    const output = document.getElementById('sqlOutput');
    output.select();
    document.execCommand('copy');
    showToast('SQL copied to clipboard!', 'success');
}

function downloadSQL() {
    const sql = document.getElementById('sqlOutput').value;
    
    if (!sql) {
        showToast('No SQL to download', 'warning');
        return;
    }
    
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_query.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('SQL downloaded!', 'success');
}

function clearAll() {
    document.getElementById('plsqlInput').value = '';
    document.getElementById('variableInput').value = '';
    document.getElementById('sqlOutput').value = '';
    document.getElementById('variablesFound').style.display = 'none';
    document.getElementById('statsInfo').style.display = 'none';
    foundVariables.clear();
    showToast('All fields cleared', 'info');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

