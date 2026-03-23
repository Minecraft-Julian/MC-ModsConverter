// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusPanel = document.getElementById('statusPanel');
const spinner = document.getElementById('spinner');
const successIcon = document.getElementById('successIcon');
const statusTitle = document.getElementById('statusTitle');
const statusDesc = document.getElementById('statusDesc');
const downloadBtn = document.getElementById('downloadBtn');

// Setup Drag & Drop Listeners
dropzone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
});

dropzone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', (e) => handleFiles(e.target.files), false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    
    if (!file.name.endsWith('.jar') && !file.name.endsWith('.zip')) {
        updateStatus('Error', 'Please upload a valid .jar file.', false);
        return;
    }

    // Hide download button & errors on new upload
    downloadBtn.classList.add('hidden');
    const errorsContainer = document.getElementById('errorsContainer');
    if (errorsContainer) errorsContainer.classList.add('hidden');

    const worker = new Worker('worker.js');
    
    worker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'status') {
            updateStatus(data.title, data.desc, data.isLoading);
        } else if (data.type === 'success') {
            updateStatus('Addon Ready!', `Converted ${data.count} assets successfully!`, false);
            
            const url = URL.createObjectURL(data.blob);
            downloadBtn.href = url;
            downloadBtn.download = data.fileName;
            downloadBtn.classList.remove('hidden');
            
            displayWarnings(data.warnings);
            worker.terminate();
        } else if (data.type === 'error') {
            updateStatus('Conversion Failed', data.message || 'An error occurred during conversion.', false);
            worker.terminate();
        }
    };

    worker.onerror = function(error) {
        updateStatus('Conversion Failed', 'A fatal worker error occurred.', false);
        console.error(error);
        worker.terminate();
    };

    worker.postMessage({ type: 'start', file: file });
}

function displayWarnings(warnings) {
    const container = document.getElementById('errorsContainer');
    const list = document.getElementById('errorsList');
    if (!container || !list) return;

    list.innerHTML = '';
    if (warnings && warnings.length > 0) {
        warnings.forEach(w => {
            const li = document.createElement('li');
            li.textContent = `[${w.path}] ${w.error}`;
            list.appendChild(li);
        });
        container.classList.remove('hidden');
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function updateStatus(title, desc, isLoading = true) {
    statusPanel.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
    
    if (isLoading) {
        spinner.classList.remove('hidden');
        successIcon.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        successIcon.classList.remove('hidden');
    }
}
