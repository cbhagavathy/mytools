document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    const transformCards = document.querySelectorAll('.transform-card');
    
    // Statistics elements
    const inputLength = document.getElementById('inputLength');
    const inputWords = document.getElementById('inputWords');
    const inputLines = document.getElementById('inputLines');
    const outputLength = document.getElementById('outputLength');
    const outputWords = document.getElementById('outputWords');
    const outputLines = document.getElementById('outputLines');
    
    const statChars = document.getElementById('statChars');
    const statLetters = document.getElementById('statLetters');
    const statNumbers = document.getElementById('statNumbers');
    const statSpaces = document.getElementById('statSpaces');
    const statSpecial = document.getElementById('statSpecial');
    const statUnique = document.getElementById('statUnique');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastMessage = document.getElementById('toastMessage');
    
    // Update statistics on input
    inputText.addEventListener('input', function() {
        updateStatistics(inputText.value);
        updateBasicStats(inputText.value, inputLength, inputWords, inputLines);
    });
    
    // Clear input button
    clearInputBtn.addEventListener('click', function() {
        inputText.value = '';
        outputText.value = '';
        updateStatistics('');
        updateBasicStats('', inputLength, inputWords, inputLines);
        updateBasicStats('', outputLength, outputWords, outputLines);
        removeAllAppliedClasses();
    });
    
    // Copy output button
    copyOutputBtn.addEventListener('click', async function() {
        if (outputText.value) {
            try {
                await navigator.clipboard.writeText(outputText.value);
                showNotification('Output copied to clipboard!', 'success');
            } catch (err) {
                showNotification('Failed to copy output', 'error');
            }
        } else {
            showNotification('No output to copy', 'warning');
        }
    });
    
    // Transform card click handlers
    transformCards.forEach(card => {
        card.addEventListener('click', function() {
            const transformType = this.getAttribute('data-transform');
            const input = inputText.value;
            
            if (!input) {
                showNotification('Please enter some text first', 'warning');
                return;
            }
            
            const result = applyTransformation(input, transformType);
            outputText.value = result;
            updateBasicStats(result, outputLength, outputWords, outputLines);
            
            // Highlight applied transformation
            removeAllAppliedClasses();
            this.classList.add('applied');
            
            showNotification(`${transformType} applied successfully!`, 'success');
        });
    });
    
    // Transformation functions
    function applyTransformation(text, type) {
        switch(type) {
            // Case transformations
            case 'uppercase':
                return text.toUpperCase();
                
            case 'lowercase':
                return text.toLowerCase();
                
            case 'titlecase':
                return text.replace(/\w\S*/g, txt => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                
            case 'sentencecase':
                return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
                
            // Naming conventions
            case 'camelcase':
                return text
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
                
            case 'pascalcase':
                return text
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
                    .replace(/^(.)/, (match, chr) => chr.toUpperCase());
                
            case 'snakecase':
                return text
                    .replace(/\W+/g, ' ')
                    .split(/ |\B(?=[A-Z])/)
                    .map(word => word.toLowerCase())
                    .join('_');
                
            case 'kebabcase':
                return text
                    .replace(/\W+/g, ' ')
                    .split(/ |\B(?=[A-Z])/)
                    .map(word => word.toLowerCase())
                    .join('-');
                
            case 'constantcase':
                return text
                    .replace(/\W+/g, ' ')
                    .split(/ |\B(?=[A-Z])/)
                    .map(word => word.toUpperCase())
                    .join('_');
                
            // Text manipulations
            case 'reverse':
                return text.split('').reverse().join('');
                
            case 'trim':
                return text.split('\n').map(line => line.trim()).join('\n');
                
            case 'removespaces':
                return text.replace(/\s+/g, '');
                
            case 'removeduplicates':
                const lines = text.split('\n');
                return [...new Set(lines)].join('\n');
                
            case 'sortlines':
                return text.split('\n').sort().join('\n');
                
            case 'reversewords':
                return text.split(' ').reverse().join(' ');
                
            case 'extractnumbers':
                const numbers = text.match(/\d+/g);
                return numbers ? numbers.join('\n') : 'No numbers found';
                
            // Encoding/Decoding
            case 'base64encode':
                try {
                    return btoa(text);
                } catch (e) {
                    return 'Error: Unable to encode. Check for special characters.';
                }
                
            case 'base64decode':
                try {
                    return atob(text);
                } catch (e) {
                    return 'Error: Invalid Base64 string';
                }
                
            case 'urlencode':
                return encodeURIComponent(text);
                
            case 'urldecode':
                try {
                    return decodeURIComponent(text);
                } catch (e) {
                    return 'Error: Invalid URL-encoded string';
                }
                
            default:
                return text;
        }
    }
    
    // Update detailed statistics
    function updateStatistics(text) {
        if (!text) {
            statChars.textContent = '0';
            statLetters.textContent = '0';
            statNumbers.textContent = '0';
            statSpaces.textContent = '0';
            statSpecial.textContent = '0';
            statUnique.textContent = '0';
            return;
        }
        
        const chars = text.length;
        const letters = (text.match(/[a-zA-Z]/g) || []).length;
        const numbers = (text.match(/[0-9]/g) || []).length;
        const spaces = (text.match(/\s/g) || []).length;
        const special = chars - letters - numbers - spaces;
        const unique = new Set(text).size;
        
        statChars.textContent = chars.toLocaleString();
        statLetters.textContent = letters.toLocaleString();
        statNumbers.textContent = numbers.toLocaleString();
        statSpaces.textContent = spaces.toLocaleString();
        statSpecial.textContent = special.toLocaleString();
        statUnique.textContent = unique.toLocaleString();
    }
    
    // Update basic statistics (length, words, lines)
    function updateBasicStats(text, lengthEl, wordsEl, linesEl) {
        const length = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const lines = text ? text.split('\n').length : 0;
        
        lengthEl.textContent = `Length: ${length.toLocaleString()}`;
        wordsEl.textContent = `Words: ${words.toLocaleString()}`;
        linesEl.textContent = `Lines: ${lines.toLocaleString()}`;
    }
    
    // Remove all applied classes
    function removeAllAppliedClasses() {
        transformCards.forEach(card => card.classList.remove('applied'));
    }
    
    // Show notification
    function showNotification(message, type) {
        toastMessage.textContent = message;
        
        const toastEl = document.getElementById('notificationToast');
        const toastHeader = toastEl.querySelector('.toast-header');
        const icon = toastHeader.querySelector('i');
        
        // Remove existing classes
        icon.className = 'bi me-2';
        
        // Set icon and color based on type
        if (type === 'success') {
            icon.classList.add('bi-check-circle-fill', 'text-success');
        } else if (type === 'error') {
            icon.classList.add('bi-x-circle-fill', 'text-danger');
        } else if (type === 'warning') {
            icon.classList.add('bi-exclamation-triangle-fill', 'text-warning');
        }
        
        toast.show();
    }
    
    // Initialize statistics
    updateStatistics('');
    updateBasicStats('', inputLength, inputWords, inputLines);
    updateBasicStats('', outputLength, outputWords, outputLines);
});

