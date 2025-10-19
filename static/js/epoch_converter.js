// EPOCH Converter JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const epochInput = document.getElementById('epochInput');
    const dateTimeInput = document.getElementById('dateTimeInput');
    const dateTimePickerInput = document.getElementById('dateTimePickerInput');
    
    const convertEpochBtn = document.getElementById('convertEpochBtn');
    const convertDateTimeBtn = document.getElementById('convertDateTimeBtn');
    const useCurrentEpochBtn = document.getElementById('useCurrentEpochBtn');
    const useNowBtn = document.getElementById('useNowBtn');
    const useTodayBtn = document.getElementById('useTodayBtn');
    const clearEpochBtn = document.getElementById('clearEpochBtn');
    const clearDateTimeBtn = document.getElementById('clearDateTimeBtn');
    
    const epochResults = document.getElementById('epochResults');
    const dateTimeResults = document.getElementById('dateTimeResults');
    
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));

    // Initialize current timestamp display
    updateCurrentTimestamp();
    setInterval(updateCurrentTimestamp, 1000);

    // Update current timestamp
    async function updateCurrentTimestamp() {
        try {
            const response = await fetch('/api/current-timestamp');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('currentEpochSeconds').textContent = data.epoch_seconds;
                document.getElementById('currentEpochMillis').textContent = data.epoch_milliseconds;
                document.getElementById('currentDateTime').textContent = data.local.readable;
                document.getElementById('currentTimezone').textContent = data.local.timezone;
            }
        } catch (error) {
            console.error('Error fetching current timestamp:', error);
        }
    }

    // Convert EPOCH to DateTime
    convertEpochBtn.addEventListener('click', async function() {
        const epochValue = epochInput.value.trim();
        
        if (!epochValue) {
            showNotification('Please enter an EPOCH timestamp', 'warning');
            return;
        }

        convertEpochBtn.disabled = true;
        convertEpochBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Converting...';

        try {
            const response = await fetch('/api/epoch-to-datetime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ epoch: epochValue })
            });

            const data = await response.json();

            if (data.success) {
                // Display results
                document.getElementById('timestampType').textContent = 
                    `EPOCH ${data.timestamp_type.charAt(0).toUpperCase() + data.timestamp_type.slice(1)}`;
                
                document.getElementById('utcReadable').textContent = data.utc.readable;
                document.getElementById('utcFull').textContent = data.utc.full;
                document.getElementById('utcIso').textContent = data.utc.iso;
                
                document.getElementById('localReadable').textContent = data.local.readable;
                document.getElementById('localFull').textContent = data.local.full;
                document.getElementById('localIso').textContent = data.local.iso;
                document.getElementById('localTimezone').textContent = `Timezone: ${data.local.timezone}`;
                
                epochResults.style.display = 'block';
                showNotification('EPOCH converted successfully!', 'success');
            } else {
                epochResults.style.display = 'none';
                showNotification(data.message, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error: ' + error.message, 'danger');
        } finally {
            convertEpochBtn.disabled = false;
            convertEpochBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Convert';
        }
    });

    // Convert DateTime to EPOCH
    convertDateTimeBtn.addEventListener('click', async function() {
        let dateTimeValue = dateTimeInput.value.trim();
        
        // If empty, try to use the date picker value
        if (!dateTimeValue && dateTimePickerInput.value) {
            dateTimeValue = dateTimePickerInput.value.replace('T', ' ');
        }
        
        if (!dateTimeValue) {
            showNotification('Please enter a date and time', 'warning');
            return;
        }

        convertDateTimeBtn.disabled = true;
        convertDateTimeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Converting...';

        try {
            const response = await fetch('/api/datetime-to-epoch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ datetime: dateTimeValue })
            });

            const data = await response.json();

            if (data.success) {
                // Display results
                document.getElementById('parsedDateTime').textContent = data.parsed_datetime;
                document.getElementById('epochSeconds').textContent = data.epoch_seconds;
                document.getElementById('epochMilliseconds').textContent = data.epoch_milliseconds;
                
                dateTimeResults.style.display = 'block';
                showNotification('DateTime converted successfully!', 'success');
            } else {
                dateTimeResults.style.display = 'none';
                showNotification(data.message, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error: ' + error.message, 'danger');
        } finally {
            convertDateTimeBtn.disabled = false;
            convertDateTimeBtn.innerHTML = '<i class="bi bi-arrow-left-circle"></i> Convert to EPOCH';
        }
    });

    // Use current EPOCH
    useCurrentEpochBtn.addEventListener('click', async function() {
        const currentEpoch = document.getElementById('currentEpochSeconds').textContent;
        epochInput.value = currentEpoch;
        convertEpochBtn.click();
    });

    // Use now for DateTime
    useNowBtn.addEventListener('click', function() {
        const now = new Date();
        const formatted = formatDateTime(now);
        dateTimeInput.value = formatted;
        dateTimePickerInput.value = now.toISOString().slice(0, 16);
    });

    // Use today at midnight
    useTodayBtn.addEventListener('click', function() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const formatted = formatDateTime(today);
        dateTimeInput.value = formatted;
        dateTimePickerInput.value = today.toISOString().slice(0, 16);
    });

    // Clear EPOCH
    clearEpochBtn.addEventListener('click', function() {
        epochInput.value = '';
        epochResults.style.display = 'none';
    });

    // Clear DateTime
    clearDateTimeBtn.addEventListener('click', function() {
        dateTimeInput.value = '';
        dateTimePickerInput.value = '';
        dateTimeResults.style.display = 'none';
    });

    // Sync datetime picker with text input
    dateTimePickerInput.addEventListener('change', function() {
        if (this.value) {
            dateTimeInput.value = this.value.replace('T', ' ') + ':00';
        }
    });

    // Copy buttons
    document.getElementById('copyUtcBtn').addEventListener('click', function() {
        const text = document.getElementById('utcReadable').textContent;
        copyToClipboard(text, 'UTC time copied!');
    });

    document.getElementById('copyLocalBtn').addEventListener('click', function() {
        const text = document.getElementById('localReadable').textContent;
        copyToClipboard(text, 'Local time copied!');
    });

    document.getElementById('copySecondsBtn').addEventListener('click', function() {
        const text = document.getElementById('epochSeconds').textContent;
        copyToClipboard(text, 'EPOCH seconds copied!');
    });

    document.getElementById('copyMillisecondsBtn').addEventListener('click', function() {
        const text = document.getElementById('epochMilliseconds').textContent;
        copyToClipboard(text, 'EPOCH milliseconds copied!');
    });

    // Helper function to format datetime
    function formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

    // Keyboard shortcuts
    epochInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            convertEpochBtn.click();
        }
    });

    dateTimeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            convertDateTimeBtn.click();
        }
    });
});

