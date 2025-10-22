// PODL Editor - Visual editor for PODL class definitions

let parsedData = null;
let currentEditingField = null;
let propertyModal = null;
let addFieldModal = null;
let addFieldParentPath = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
});

function initializeEditor() {
    // Initialize Bootstrap modals
    propertyModal = new bootstrap.Modal(document.getElementById('propertyModal'));
    addFieldModal = new bootstrap.Modal(document.getElementById('addFieldModal'));

    // Event listeners
    document.getElementById('parseBtn').addEventListener('click', parsePODL);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('expandAllBtn').addEventListener('click', expandAll);
    document.getElementById('collapseAllBtn').addEventListener('click', collapseAll);
    document.getElementById('exportBtn').addEventListener('click', exportPODL);
    document.getElementById('copyBtn').addEventListener('click', copyOutput);
    document.getElementById('savePropertiesBtn').addEventListener('click', saveProperties);
    document.getElementById('loadDemoBtn').addEventListener('click', loadDemo);
    document.getElementById('deleteFieldBtn').addEventListener('click', deleteField);
    document.getElementById('fullscreenEditorBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('addFieldBtn').addEventListener('click', addNewField);
    
    // Add listener for field type changes to show/hide LENGTH field
    document.getElementById('fieldType').addEventListener('change', handleFieldTypeChange);
    document.getElementById('newFieldType').addEventListener('change', handleNewFieldTypeChange);
}

function loadDemo() {
    const demoContent = `
#=======================================
#  Field INTU_FLD_ECOSYSTEM
#=======================================

ARRAY INTU_FLD_ECOSYSTEM {

\tID = 102074;
}


#=======================================
#  Field INTU_FLD_DURATION
#=======================================

INT INTU_FLD_DURATION {

\tID = 100011;
}


#=======================================
#  Field PIN_FLD_CODE
#=======================================

STRING PIN_FLD_CODE {

\tID = 25;
}


#=======================================
#  Field PIN_FLD_DESCR
#=======================================

STRING PIN_FLD_DESCR {

\tID = 54;
}


#=======================================
#  Field PIN_FLD_SERVICES
#=======================================

ARRAY PIN_FLD_SERVICES {

\tID = 122;
}


#=======================================
#  Storable Class /config/intu_ecosystem
#=======================================

STORABLE CLASS /config/intu_ecosystem {

\tREAD_ACCESS = "Self";
\tWRITE_ACCESS = "Self";
\tDESCR = "Config object to store readonly duration per ecosystem";
\tIS_PARTITIONED = "0";

\t#===================
\t#  Fields 
\t#===================

\tARRAY INTU_FLD_ECOSYSTEM {

\t\tORDER = 0;
\t\tAUDITABLE = 0;
\t\tENCRYPTABLE = 0;
\t\tSERIALIZABLE = 0;

\t\t#===================
\t\t#  Fields 
\t\t#===================

\t\tINT INTU_FLD_DURATION {

\t\t\tDESCR = "readonly duration in number of months";
\t\t\tORDER = 0;
\t\t\tCREATE = Optional;
\t\t\tMODIFY = Writeable;
\t\t\tAUDITABLE = 0;
\t\t\tENCRYPTABLE = 0;
\t\t\tSERIALIZABLE = 0;
\t\t}

\t\tSTRING PIN_FLD_CODE {

\t\t\tDESCR = "EcoSystem code";
\t\t\tORDER = 1;
\t\t\tLENGTH = 60;
\t\t\tCREATE = Optional;
\t\t\tMODIFY = Writeable;
\t\t\tAUDITABLE = 0;
\t\t\tENCRYPTABLE = 0;
\t\t\tSERIALIZABLE = 0;
\t\t}

\t\tSTRING PIN_FLD_DESCR {

\t\t\tDESCR = "EcoSystem description";
\t\t\tORDER = 2;
\t\t\tLENGTH = 255;
\t\t\tCREATE = Optional;
\t\t\tMODIFY = Writeable;
\t\t\tAUDITABLE = 0;
\t\t\tENCRYPTABLE = 0;
\t\t\tSERIALIZABLE = 0;
\t\t}

\t\tARRAY PIN_FLD_SERVICES {

\t\t\tORDER = 3;
\t\t\tAUDITABLE = 0;
\t\t\tENCRYPTABLE = 0;
\t\t\tSERIALIZABLE = 0;
\t\t}

\t}

}
`;
    
    document.getElementById('podlInput').value = demoContent.trim();
    
    // Auto-parse after loading
    setTimeout(() => {
        parsePODL();
        
        // Show a success message
        const alert = document.querySelector('.alert-info');
        if (alert) {
            const originalContent = alert.innerHTML;
            alert.innerHTML = `
                <h5 class="alert-heading"><i class="fas fa-check-circle"></i> Demo Loaded Successfully!</h5>
                <p class="mb-0 small">You can now try dragging fields to reorder them or clicking "Edit" to modify properties.</p>
            `;
            alert.classList.remove('alert-info');
            alert.classList.add('alert-success');
            
            setTimeout(() => {
                alert.innerHTML = originalContent;
                alert.classList.remove('alert-success');
                alert.classList.add('alert-info');
            }, 5000);
        }
    }, 100);
}

function parsePODL() {
    const input = document.getElementById('podlInput').value.trim();
    
    if (!input) {
        alert('Please enter PODL content');
        return;
    }

    // Warn if there are unsaved changes
    if (parsedData && parsedData.fields && parsedData.fields.length > 0) {
        const confirmReparse = confirm('⚠️ Warning: Re-parsing will lose any unsaved edits!\n\nYou have already parsed PODL content. Re-parsing will reset all your changes (field reordering, edits, etc.).\n\nDo you want to continue and lose your changes?');
        if (!confirmReparse) {
            return;
        }
    }

    try {
        parsedData = parsePODLContent(input);
        renderEditor(parsedData);
        generateOutput();
        
        // Enable export buttons
        document.getElementById('exportBtn').disabled = false;
        document.getElementById('copyBtn').disabled = false;
        
        showToast('PODL parsed successfully', 'success');
    } catch (error) {
        alert('Error parsing PODL: ' + error.message);
        console.error(error);
    }
}

function parsePODLContent(content) {
    const lines = content.split('\n');
    const data = {
        className: '',
        classProperties: {},
        fields: [],
        implementation: null
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Parse STORABLE CLASS
        if (line.startsWith('STORABLE CLASS') && !line.includes('IMPLEMENTATION')) {
            const match = line.match(/STORABLE CLASS\s+([\w\/]+)\s*\{/);
            if (match) {
                data.className = match[1];
                const result = parseClassProperties(lines, i + 1);
                data.classProperties = result.properties;
                data.fields = result.fields;
                i = result.endIndex;
            }
        }
        // Parse IMPLEMENTATION section
        else if (line.startsWith('STORABLE CLASS') && line.includes('IMPLEMENTATION')) {
            const match = line.match(/STORABLE CLASS\s+([\w\/]+)\s+IMPLEMENTATION\s+(\w+)/);
            if (match) {
                const result = parseImplementation(lines, i + 1);
                data.implementation = {
                    type: match[2],
                    fields: result.fields
                };
                i = result.endIndex;
            }
        }
        i++;
    }

    return data;
}

function parseClassProperties(lines, startIndex) {
    const properties = {};
    const fields = [];
    let i = startIndex;
    let braceCount = 1;

    while (i < lines.length && braceCount > 0) {
        const line = lines[i].trim();
        
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) {
            braceCount--;
            if (braceCount === 0) break;
        }

        // Parse class-level properties
        if (line.includes('=') && !line.startsWith('INT ') && !line.startsWith('STRING ') && !line.startsWith('ARRAY ')) {
            const parts = line.split('=');
            if (parts.length === 2) {
                const key = parts[0].trim();
                const value = parts[1].replace(';', '').trim().replace(/"/g, '');
                properties[key] = value;
            }
        }
        
        // Parse fields
        if ((line.startsWith('INT ') || line.startsWith('STRING ') || line.startsWith('ARRAY ')) && line.includes('{')) {
            const field = parseField(lines, i);
            fields.push(field);
            i = field.endIndex;
        }

        i++;
    }

    return { properties, fields, endIndex: i };
}

function parseField(lines, startIndex) {
    const firstLine = lines[startIndex].trim();
    const match = firstLine.match(/(INT|STRING|ARRAY)\s+([\w]+)\s*\{/);
    
    const field = {
        type: match[1],
        name: match[2],
        properties: {},
        children: [],
        endIndex: startIndex
    };

    let i = startIndex + 1;
    let braceCount = 1;

    while (i < lines.length && braceCount > 0) {
        const line = lines[i].trim();
        
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) {
            braceCount--;
            if (braceCount === 0) {
                field.endIndex = i;
                break;
            }
        }

        // Parse field properties
        if (line.includes('=') && !line.startsWith('INT ') && !line.startsWith('STRING ') && !line.startsWith('ARRAY ')) {
            const parts = line.split('=');
            if (parts.length === 2) {
                const key = parts[0].trim();
                let value = parts[1].replace(';', '').trim();
                
                // Remove quotes from string values
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                
                field.properties[key] = value;
            }
        }

        // Parse nested fields
        if ((line.startsWith('INT ') || line.startsWith('STRING ') || line.startsWith('ARRAY ')) && line.includes('{')) {
            const childField = parseField(lines, i);
            field.children.push(childField);
            i = childField.endIndex;
        }

        i++;
    }

    return field;
}

function parseImplementation(lines, startIndex) {
    const fields = [];
    let i = startIndex;
    let braceCount = 1;

    while (i < lines.length && braceCount > 0) {
        const line = lines[i].trim();
        
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) {
            braceCount--;
            if (braceCount === 0) break;
        }

        if ((line.startsWith('INT ') || line.startsWith('STRING ') || line.startsWith('ARRAY ')) && line.includes('{')) {
            const field = parseField(lines, i);
            fields.push(field);
            i = field.endIndex;
        }

        i++;
    }

    return { fields, endIndex: i };
}

function renderEditor(data) {
    const container = document.getElementById('editorContainer');
    container.innerHTML = '';

    if (!data.className) {
        container.innerHTML = '<div class="alert alert-warning">No STORABLE CLASS found</div>';
        return;
    }

    // Render class header (compact)
    const classHeader = document.createElement('div');
    classHeader.className = 'card mb-3';
    classHeader.innerHTML = `
        <div class="card-header bg-dark text-white" style="padding: 0.5rem 0.75rem;">
            <h5 class="mb-0" style="font-size: 1rem;">
                <i class="fas fa-database"></i> ${data.className}
            </h5>
        </div>
        <div class="card-body" style="padding: 0.5rem 0.75rem;">
            ${Object.entries(data.classProperties).sort().map(([key, value]) => `
                <div class="row mb-1" style="font-size: 0.85rem;">
                    <div class="col-5 fw-bold">${key}:</div>
                    <div class="col-7">${value}</div>
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(classHeader);

    // Render fields
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'fields-container';
    data.fields.forEach((field, index) => {
        fieldsContainer.appendChild(renderFieldNode(field, index, []));
    });
    
    // Add "Add Field" button at root level
    const addFieldBtn = document.createElement('button');
    addFieldBtn.className = 'btn btn-success btn-sm mt-2 mb-2';
    addFieldBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Field';
    addFieldBtn.style.cssText = 'padding: 0.4rem 0.8rem; font-size: 0.9rem;';
    addFieldBtn.addEventListener('click', function() {
        openAddFieldModal([]);
    });
    fieldsContainer.appendChild(addFieldBtn);
    
    container.appendChild(fieldsContainer);

    // Make fields sortable
    makeSortable(fieldsContainer, []);
}

function renderFieldNode(field, index, path) {
    const fieldPath = [...path, index];
    const fieldId = 'field-' + fieldPath.join('-');
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field-item card mb-2';
    fieldDiv.draggable = true;
    fieldDiv.dataset.path = JSON.stringify(fieldPath);

    const hasChildren = field.children && field.children.length > 0;
    const isExpanded = true; // Default expanded

    // Truncate description for compact view
    let displayDescr = '';
    if (field.properties.DESCR) {
        const descr = field.properties.DESCR;
        displayDescr = descr.length > 40 ? descr.substring(0, 40) + '...' : descr;
    }

    fieldDiv.innerHTML = `
        <div class="card-header" style="cursor: move; background-color: ${getFieldColor(field.type)}; padding: 0.4rem 0.6rem;">
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center" style="flex: 1; min-width: 0;">
                    <i class="fas fa-grip-vertical me-2" style="font-size: 0.9rem;"></i>
                    ${hasChildren ? `<i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} toggle-children me-2" style="cursor: pointer; font-size: 0.8rem;"></i>` : ''}
                    <span class="badge bg-secondary me-2" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">${field.type}</span>
                    <strong style="font-size: 0.9rem;">${field.name}</strong>
                    ${displayDescr ? `<small class="text-muted ms-2" style="font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">- ${displayDescr}</small>` : ''}
                </div>
                <div class="d-flex" style="flex-shrink: 0; gap: 0.25rem;">
                    <button class="btn btn-sm btn-primary edit-field-btn" data-path='${JSON.stringify(fieldPath)}' title="Edit Field Properties" style="padding: 0.3rem 0.5rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                        <i class="fas fa-edit"></i><span style="font-size: 0.7rem;">Edit</span>
                    </button>
                    <button class="btn btn-sm btn-danger delete-field-btn" data-path='${JSON.stringify(fieldPath)}' title="Delete Field Permanently" style="padding: 0.3rem 0.5rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                        <i class="fas fa-trash"></i><span style="font-size: 0.7rem;">Del</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="card-body" style="padding: 0.4rem 0.6rem;">
            <div class="field-properties">
                ${renderProperties(field.properties)}
            </div>
            ${hasChildren ? `<div class="field-children mt-2" id="${fieldId}-children" style="margin-left: 15px; margin-top: 0.5rem; border-left: 2px solid #dee2e6; padding-left: 8px;"></div>` : ''}
        </div>
    `;

    // Add event listener for edit button
    fieldDiv.querySelector('.edit-field-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        editField(JSON.parse(this.dataset.path));
    });

    // Add event listener for delete button
    fieldDiv.querySelector('.delete-field-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        const path = JSON.parse(this.dataset.path);
        if (confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
            deleteFieldByPath(path);
        }
    });

    // Add event listener for toggle children
    if (hasChildren) {
        const toggleBtn = fieldDiv.querySelector('.toggle-children');
        const childrenContainer = fieldDiv.querySelector(`#${fieldId}-children`);
        
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isCurrentlyExpanded = this.classList.contains('fa-chevron-down');
            if (isCurrentlyExpanded) {
                this.classList.remove('fa-chevron-down');
                this.classList.add('fa-chevron-right');
                childrenContainer.style.display = 'none';
            } else {
                this.classList.remove('fa-chevron-right');
                this.classList.add('fa-chevron-down');
                childrenContainer.style.display = 'block';
            }
        });

        // Render children
        field.children.forEach((child, childIndex) => {
            childrenContainer.appendChild(renderFieldNode(child, childIndex, fieldPath));
        });

        // Add "Add Field" button for ARRAY fields
        const addChildBtn = document.createElement('button');
        addChildBtn.className = 'btn btn-success btn-sm mt-2';
        addChildBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Child Field';
        addChildBtn.style.cssText = 'padding: 0.3rem 0.6rem; font-size: 0.8rem;';
        addChildBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openAddFieldModal(fieldPath);
        });
        childrenContainer.appendChild(addChildBtn);

        makeSortable(childrenContainer, fieldPath);
    }

    return fieldDiv;
}

function getFieldColor(type) {
    switch(type) {
        case 'INT': return '#e3f2fd';
        case 'STRING': return '#f3e5f5';
        case 'ARRAY': return '#e8f5e9';
        default: return '#f5f5f5';
    }
}

function renderProperties(properties) {
    if (Object.keys(properties).length === 0) {
        return '<small class="text-muted" style="font-size: 0.7rem;">No properties</small>';
    }

    // Only show the most important properties in compact view
    const importantProps = ['ORDER', 'LENGTH', 'DESCR', 'CREATE', 'MODIFY'];
    const displayProps = Object.entries(properties).filter(([key]) => 
        importantProps.includes(key) || key.startsWith('SQL_')
    );
    
    if (displayProps.length === 0) {
        return '<small class="text-muted" style="font-size: 0.7rem;">Basic config</small>';
    }

    return displayProps
        .map(([key, value]) => {
            // Truncate long descriptions
            let displayValue = value;
            if (key === 'DESCR' && value.length > 30) {
                displayValue = value.substring(0, 30) + '...';
            }
            return `<span class="badge bg-light text-dark me-1" style="font-size: 0.65rem; padding: 0.15rem 0.3rem;">${key}: <strong>${displayValue}</strong></span>`;
        }).join('');
}

function makeSortable(container, path) {
    let draggedElement = null;

    container.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('field-item')) {
            draggedElement = e.target;
            e.target.style.opacity = '0.5';
        }
    });

    container.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('field-item')) {
            e.target.style.opacity = '1';
        }
    });

    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggedElement);
        } else {
            container.insertBefore(draggedElement, afterElement);
        }
    });

    container.addEventListener('drop', function(e) {
        e.preventDefault();
        updateFieldOrder(container, path);
        generateOutput();
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.field-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateFieldOrder(container, path) {
    const fieldElements = container.querySelectorAll(':scope > .field-item');
    const newOrder = [];

    fieldElements.forEach(element => {
        const fieldPath = JSON.parse(element.dataset.path);
        const field = getFieldByPath(parsedData.fields, fieldPath);
        newOrder.push(field);
    });

    // Update the actual data structure
    if (path.length === 0) {
        parsedData.fields = newOrder;
    } else {
        const parentField = getFieldByPath(parsedData.fields, path);
        parentField.children = newOrder;
    }

    // Update ORDER properties
    newOrder.forEach((field, index) => {
        field.properties.ORDER = index.toString();
    });
}

function getFieldByPath(fields, path) {
    let current = fields[path[0]];
    for (let i = 1; i < path.length; i++) {
        current = current.children[path[i]];
    }
    return current;
}

function editField(path) {
    currentEditingField = path;
    const field = getFieldByPath(parsedData.fields, path);

    // Populate modal
    document.getElementById('fieldPath').value = JSON.stringify(path);
    document.getElementById('fieldName').value = field.name;
    document.getElementById('fieldType').value = field.type;
    document.getElementById('fieldOrder').value = field.properties.ORDER || '';
    document.getElementById('fieldLength').value = field.properties.LENGTH || '';
    document.getElementById('fieldDescr').value = field.properties.DESCR || '';
    document.getElementById('fieldCreate').value = field.properties.CREATE || '';
    document.getElementById('fieldModify').value = field.properties.MODIFY || '';
    document.getElementById('fieldAuditable').checked = field.properties.AUDITABLE === '1';
    document.getElementById('fieldEncryptable').checked = field.properties.ENCRYPTABLE === '1';
    document.getElementById('fieldSerializable').checked = field.properties.SERIALIZABLE === '1';
    document.getElementById('fieldSqlColumn').value = field.properties.SQL_COLUMN || '';
    document.getElementById('fieldSqlTable').value = field.properties.SQL_TABLE || '';

    // Show/hide LENGTH field based on type
    handleFieldTypeChange();

    propertyModal.show();
}

function handleFieldTypeChange() {
    const fieldType = document.getElementById('fieldType').value;
    const lengthRow = document.getElementById('fieldLength').closest('.col-md-6');
    
    // LENGTH is only applicable for STRING and BINSTR types
    if (fieldType === 'STRING' || fieldType === 'BINSTR') {
        lengthRow.style.display = 'block';
    } else {
        lengthRow.style.display = 'none';
        document.getElementById('fieldLength').value = ''; // Clear length for non-string types
    }
}

function saveProperties() {
    const path = JSON.parse(document.getElementById('fieldPath').value);
    const field = getFieldByPath(parsedData.fields, path);

    // Update field name
    const newFieldName = document.getElementById('fieldName').value.trim();
    if (newFieldName && newFieldName !== field.name) {
        // Validate field name (basic check for valid identifier)
        if (/^[A-Z][A-Z0-9_]*$/.test(newFieldName)) {
            field.name = newFieldName;
            showToast(`Field renamed to ${newFieldName}`, 'success');
        } else {
            alert('Invalid field name. Field names should start with uppercase letter and contain only uppercase letters, numbers, and underscores.');
            return;
        }
    }

    // Update field type
    const newFieldType = document.getElementById('fieldType').value;
    if (newFieldType && newFieldType !== field.type) {
        const oldType = field.type;
        field.type = newFieldType;
        showToast(`Field type changed from ${oldType} to ${newFieldType}`, 'success');
        
        // If changing away from STRING/BINSTR, remove LENGTH property
        if (newFieldType !== 'STRING' && newFieldType !== 'BINSTR' && field.properties.LENGTH) {
            delete field.properties.LENGTH;
        }
    }

    // Update properties
    const order = document.getElementById('fieldOrder').value;
    const length = document.getElementById('fieldLength').value;
    const descr = document.getElementById('fieldDescr').value;
    const create = document.getElementById('fieldCreate').value;
    const modify = document.getElementById('fieldModify').value;
    const auditable = document.getElementById('fieldAuditable').checked ? '1' : '0';
    const encryptable = document.getElementById('fieldEncryptable').checked ? '1' : '0';
    const serializable = document.getElementById('fieldSerializable').checked ? '1' : '0';
    const sqlColumn = document.getElementById('fieldSqlColumn').value;
    const sqlTable = document.getElementById('fieldSqlTable').value;

    if (order) field.properties.ORDER = order;
    if (length) field.properties.LENGTH = length;
    if (descr) field.properties.DESCR = descr;
    else delete field.properties.DESCR;
    
    if (create) field.properties.CREATE = create;
    else delete field.properties.CREATE;
    
    if (modify) field.properties.MODIFY = modify;
    else delete field.properties.MODIFY;

    field.properties.AUDITABLE = auditable;
    field.properties.ENCRYPTABLE = encryptable;
    field.properties.SERIALIZABLE = serializable;

    if (sqlColumn) field.properties.SQL_COLUMN = sqlColumn;
    else delete field.properties.SQL_COLUMN;
    
    if (sqlTable) field.properties.SQL_TABLE = sqlTable;
    else delete field.properties.SQL_TABLE;

    // Refresh display
    renderEditor(parsedData);
    generateOutput();
    propertyModal.hide();
}

function generateOutput() {
    if (!parsedData) return;

    let output = generatePODLOutput(parsedData);
    document.getElementById('podlOutput').textContent = output;
}

function generatePODLOutput(data) {
    let output = '';

    // Generate field definitions (header)
    output += generateFieldDefinitions(data.fields);

    // Generate STORABLE CLASS
    output += '\n#=======================================\n';
    output += `#  Storable Class ${data.className}\n`;
    output += '#=======================================\n\n';
    output += `STORABLE CLASS ${data.className} {\n\n`;

    // Class properties - output each property correctly
    Object.entries(data.classProperties).forEach(([key, value]) => {
        // Check if value should be quoted
        if (key === 'DESCR' || key === 'READ_ACCESS' || key === 'WRITE_ACCESS' || key === 'EVENT_TYPE') {
            output += `\t${key} = "${value}";\n`;
        } else {
            output += `\t${key} = "${value}";\n`;
        }
    });
    output += '\n';

    // Fields
    output += '\t#===================\n';
    output += '\t#  Fields \n';
    output += '\t#===================\n\n';

    data.fields.forEach(field => {
        output += generateFieldOutput(field, 1);
    });

    output += '}\n\n';

    // Generate implementation if present
    if (data.implementation) {
        output += generateImplementationOutput(data);
    }

    return output;
}

function generateFieldDefinitions(fields) {
    let output = '';
    
    fields.forEach(field => {
        output += '\n#=======================================\n';
        output += `#  Field ${field.name}\n`;
        output += '#=======================================\n\n';
        output += `${field.type} ${field.name} {\n\n`;
        output += `\tID = ${field.properties.ID || '0'};\n`;
        output += '}\n';

        if (field.children && field.children.length > 0) {
            output += generateFieldDefinitions(field.children);
        }
    });

    return output;
}

function generateFieldOutput(field, indent) {
    const tabs = '\t'.repeat(indent);
    let output = '';

    output += `${tabs}${field.type} ${field.name} {\n\n`;

    // Output properties
    Object.entries(field.properties).forEach(([key, value]) => {
        if (key === 'DESCR') {
            output += `${tabs}\t${key} = "${value}";\n`;
        } else {
            output += `${tabs}\t${key} = ${value};\n`;
        }
    });

    // Output children
    if (field.children && field.children.length > 0) {
        output += '\n' + tabs + '\t#===================\n';
        output += tabs + '\t#  Fields \n';
        output += tabs + '\t#===================\n\n';

        field.children.forEach(child => {
            output += generateFieldOutput(child, indent + 1);
        });
    }

    output += `${tabs}}\n\n`;
    return output;
}

function generateImplementationOutput(data) {
    let output = '';

    output += '#=======================================\n';
    output += `#  Storable Class ${data.className}\n`;
    output += '#=======================================\n\n';
    output += `STORABLE CLASS ${data.className} IMPLEMENTATION ${data.implementation.type} {\n\n`;

    output += '\n\t#===================\n';
    output += '\t#  Fields \n';
    output += '\t#===================\n\n';

    data.implementation.fields.forEach(field => {
        output += generateImplementationField(field, 1);
    });

    output += '}\n\n';
    return output;
}

function generateImplementationField(field, indent) {
    const tabs = '\t'.repeat(indent);
    let output = '';

    output += `${tabs}${field.type} ${field.name} {\n\n`;

    Object.entries(field.properties).forEach(([key, value]) => {
        output += `${tabs}\t${key} = "${value}";\n`;
    });

    if (field.children && field.children.length > 0) {
        output += '\n' + tabs + '\t#===================\n';
        output += tabs + '\t#  Fields \n';
        output += tabs + '\t#===================\n\n';

        field.children.forEach(child => {
            output += generateImplementationField(child, indent + 1);
        });
    }

    output += `${tabs}}\n\n`;
    return output;
}

function clearAll() {
    document.getElementById('podlInput').value = '';
    document.getElementById('podlOutput').textContent = 'No output yet...';
    document.getElementById('editorContainer').innerHTML = `
        <div class="text-muted text-center py-5">
            <i class="fas fa-info-circle fa-3x mb-3"></i>
            <p>Parse a PODL file to start editing</p>
        </div>
    `;
    parsedData = null;
    document.getElementById('exportBtn').disabled = true;
    document.getElementById('copyBtn').disabled = true;
}

function expandAll() {
    document.querySelectorAll('.toggle-children').forEach(btn => {
        if (btn.classList.contains('fa-chevron-right')) {
            btn.click();
        }
    });
}

function collapseAll() {
    document.querySelectorAll('.toggle-children').forEach(btn => {
        if (btn.classList.contains('fa-chevron-down')) {
            btn.click();
        }
    });
}

function exportPODL() {
    const output = document.getElementById('podlOutput').textContent;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (parsedData.className || 'output').replace(/\//g, '_') + '.podl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyOutput() {
    const output = document.getElementById('podlOutput').textContent;
    navigator.clipboard.writeText(output).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-light');
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-light');
        }, 2000);
    });
}

function deleteField() {
    // This is called from the modal's delete button
    if (!currentEditingField) return;
    
    if (confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
        deleteFieldByPath(currentEditingField);
        propertyModal.hide();
    }
}

function deleteFieldByPath(path) {
    if (path.length === 1) {
        // Delete from root level
        parsedData.fields.splice(path[0], 1);
    } else {
        // Navigate to parent and delete from children
        let parent = parsedData.fields[path[0]];
        for (let i = 1; i < path.length - 1; i++) {
            parent = parent.children[path[i]];
        }
        parent.children.splice(path[path.length - 1], 1);
    }
    
    // Refresh display
    renderEditor(parsedData);
    generateOutput();
    
    // Show success message
    showToast('Field deleted successfully', 'success');
}

function toggleFullscreen() {
    const editorColumn = document.getElementById('editorColumn');
    const outputColumn = document.getElementById('outputColumn');
    const editorCardBody = document.getElementById('editorCardBody');
    const btn = document.getElementById('fullscreenEditorBtn');
    const editorCard = editorColumn.querySelector('.card');
    
    if (editorColumn.classList.contains('col-md-6')) {
        // Expand to fullscreen
        editorColumn.classList.remove('col-md-6');
        editorColumn.classList.add('col-md-12');
        outputColumn.style.display = 'none';
        
        // Make the editor card fixed and take full viewport
        editorCard.style.position = 'fixed';
        editorCard.style.top = '80px';
        editorCard.style.left = '20px';
        editorCard.style.right = '20px';
        editorCard.style.bottom = '20px';
        editorCard.style.zIndex = '1000';
        editorCard.style.maxWidth = 'calc(100vw - 40px)';
        
        // Make the card body take up available space
        editorCardBody.style.maxHeight = 'calc(100vh - 180px)';
        editorCardBody.style.height = 'calc(100vh - 180px)';
        
        btn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
        btn.classList.remove('btn-light');
        btn.classList.add('btn-warning');
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'fullscreen-backdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; cursor: pointer;';
        backdrop.addEventListener('click', toggleFullscreen);
        document.body.appendChild(backdrop);
        
        // Add ESC key listener
        document.addEventListener('keydown', handleFullscreenEscape);
        
        // Scroll to top of editor
        editorCardBody.scrollTop = 0;
    } else {
        // Return to split view
        editorColumn.classList.remove('col-md-12');
        editorColumn.classList.add('col-md-6');
        outputColumn.style.display = 'block';
        
        // Reset card styles
        editorCard.style.position = '';
        editorCard.style.top = '';
        editorCard.style.left = '';
        editorCard.style.right = '';
        editorCard.style.bottom = '';
        editorCard.style.zIndex = '';
        editorCard.style.maxWidth = '';
        
        editorCardBody.style.maxHeight = '700px';
        editorCardBody.style.height = '';
        
        btn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-light');
        
        // Remove backdrop
        const backdrop = document.getElementById('fullscreen-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        
        // Remove ESC key listener
        document.removeEventListener('keydown', handleFullscreenEscape);
    }
}

function handleFullscreenEscape(e) {
    if (e.key === 'Escape') {
        const editorColumn = document.getElementById('editorColumn');
        if (editorColumn.classList.contains('col-md-12')) {
            toggleFullscreen();
        }
    }
}

function showToast(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 250px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
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

function openAddFieldModal(parentPath) {
    addFieldParentPath = parentPath;
    
    // Clear form
    document.getElementById('addFieldForm').reset();
    document.getElementById('addFieldParentPath').value = JSON.stringify(parentPath);
    
    // Show parent location in modal
    const alertDiv = document.querySelector('#addFieldModal .alert-info');
    if (parentPath.length === 0) {
        alertDiv.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Adding new field at root level</strong> - Fill in the details below';
    } else {
        const parentField = getFieldByPath(parentPath);
        alertDiv.innerHTML = `<i class="fas fa-info-circle"></i> <strong>Adding child field to: ${parentField.name}</strong> - Fill in the details below`;
    }
    
    // Handle LENGTH field visibility
    handleNewFieldTypeChange();
    
    // Show modal
    addFieldModal.show();
}

function handleNewFieldTypeChange() {
    const fieldType = document.getElementById('newFieldType').value;
    const lengthInput = document.getElementById('newFieldLength');
    const lengthGroup = lengthInput.closest('.col-md-6');
    
    if (fieldType === 'STRING' || fieldType === 'BINSTR') {
        lengthGroup.style.display = 'block';
        lengthInput.required = true;
    } else {
        lengthGroup.style.display = 'none';
        lengthInput.required = false;
        lengthInput.value = '';
    }
}

function addNewField() {
    // Get form values
    const fieldName = document.getElementById('newFieldName').value.trim();
    const fieldType = document.getElementById('newFieldType').value;
    const fieldId = document.getElementById('newFieldId').value.trim();
    const fieldLength = document.getElementById('newFieldLength').value.trim();
    const fieldDescr = document.getElementById('newFieldDescr').value.trim();
    const fieldCreate = document.getElementById('newFieldCreate').value;
    const fieldModify = document.getElementById('newFieldModify').value;
    const fieldAuditable = document.getElementById('newFieldAuditable').checked;
    const fieldEncryptable = document.getElementById('newFieldEncryptable').checked;
    const fieldSerializable = document.getElementById('newFieldSerializable').checked;
    const fieldSqlColumn = document.getElementById('newFieldSqlColumn').value.trim();
    const fieldSqlTable = document.getElementById('newFieldSqlTable').value.trim();
    
    // Validate field name
    if (!fieldName) {
        alert('Field Name is required!');
        return;
    }
    
    if (!/^[A-Z][A-Z0-9_]*$/.test(fieldName)) {
        alert('Field Name must start with uppercase letter (A-Z) and contain only A-Z, 0-9, and underscore (_)');
        return;
    }
    
    // Create new field object
    const newField = {
        name: fieldName,
        type: fieldType,
        properties: {}
    };
    
    // Add properties if set
    if (fieldId) newField.properties.ID = fieldId;
    if (fieldLength && (fieldType === 'STRING' || fieldType === 'BINSTR')) {
        newField.properties.LENGTH = fieldLength;
    }
    if (fieldDescr) newField.properties.DESCR = fieldDescr;
    if (fieldCreate) newField.properties.CREATE = fieldCreate;
    if (fieldModify) newField.properties.MODIFY = fieldModify;
    if (fieldAuditable) newField.properties.AUDITABLE = 'Yes';
    if (fieldEncryptable) newField.properties.ENCRYPTABLE = 'Yes';
    if (fieldSerializable) newField.properties.SERIALIZABLE = 'Yes';
    if (fieldSqlColumn) newField.properties.SQL_COLUMN = fieldSqlColumn;
    if (fieldSqlTable) newField.properties.SQL_TABLE = fieldSqlTable;
    
    // Add ORDER property (set to next available order number)
    if (addFieldParentPath.length === 0) {
        newField.properties.ORDER = parsedData.fields.length.toString();
    } else {
        const parentField = getFieldByPath(addFieldParentPath);
        if (!parentField.children) {
            parentField.children = [];
        }
        newField.properties.ORDER = parentField.children.length.toString();
    }
    
    // Initialize children array for ARRAY type
    if (fieldType === 'ARRAY') {
        newField.children = [];
    }
    
    // Add field to data structure
    if (addFieldParentPath.length === 0) {
        parsedData.fields.push(newField);
    } else {
        const parentField = getFieldByPath(addFieldParentPath);
        if (!parentField.children) {
            parentField.children = [];
        }
        parentField.children.push(newField);
    }
    
    // Re-render editor
    renderEditor(parsedData);
    
    // Update output
    generatePODLOutput();
    
    // Hide modal
    addFieldModal.hide();
    
    // Show success message
    showToast(`Field "${fieldName}" added successfully!`, 'success');
}

