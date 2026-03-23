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

    if (file.size > 100 * 1024 * 1024) { // over 100mb
        if (!confirm("This file is heavily sized (>100MB). Extremely large modifications may hang or crash your browser tab during geometry extraction. Do you wish to continue?")) {
            return;
        }
    }

    const convertModels = document.getElementById('convertModels') ? document.getElementById('convertModels').checked : true;
    const debugMode = document.getElementById('debugMode') ? document.getElementById('debugMode').checked : false;

    // Hide download button & UI resets on new upload
    downloadBtn.classList.add('hidden');
    const errorsContainer = document.getElementById('errorsContainer');
    if (errorsContainer) errorsContainer.classList.add('hidden');
    const prescanPanel = document.getElementById('prescanPanel');
    if (prescanPanel) prescanPanel.classList.add('hidden');
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    const debugConsole = document.getElementById('debugConsole');
    if (debugConsole) {
        debugConsole.classList.add('hidden');
        debugConsole.innerHTML = '';
    }

    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');
    
    worker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'status') {
            updateStatus(data.title, data.desc, data.isLoading);
            const progressContainer = document.getElementById('progressContainer');
            const progressBarFill = document.getElementById('progressBarFill');
            if (data.percent !== undefined) {
                progressContainer.classList.remove('hidden');
                progressBarFill.style.width = `${data.percent}%`;
            } else {
                progressContainer.classList.add('hidden');
            }
        } else if (data.type === 'progress') {
            updateStatus('Converting Asset Tree...', `Processed (${data.current} / ${data.total}) files`, true);
            const progressContainer = document.getElementById('progressContainer');
            const progressBarFill = document.getElementById('progressBarFill');
            const timeEst = document.getElementById('timeEstimate');
            
            progressContainer.classList.remove('hidden');
            progressBarFill.style.width = `${data.percent}%`;
            timeEst.classList.remove('hidden');
            timeEst.textContent = data.timeStr;
            
        } else if (data.type === 'prescan') {
            const panel = document.getElementById('prescanPanel');
            panel.classList.remove('hidden');
            document.getElementById('compatScore').textContent = `Compatibility: ${data.score}%`;
            document.getElementById('prescanList').innerHTML = `
                <li>🟢 ${data.stats.textures} textures</li>
                <li>🟢 ${data.stats.models} models</li>
                <li>${data.stats.animations > 0 ? '🟢 ' + data.stats.animations + ' animations' : '🟠 0 animations'}</li>
                <li>${data.stats.classes > 0 ? '<span style="color:#F59E0B">⚠️</span> ' + data.stats.classes + ' java files' : '🟢 0 java files'}</li>
            `;
            if (debugMode) {
                const con = document.getElementById('debugConsole');
                con.classList.remove('hidden');
                con.innerHTML += `<div>[SYSTEM] Prescan executed: ${JSON.stringify(data.stats)}</div>`;
            }
            
        } else if (data.type === 'debug') {
            if (debugMode) {
                const con = document.getElementById('debugConsole');
                con.classList.remove('hidden');
                con.innerHTML += `<div>${data.msg}</div>`;
                con.scrollTop = con.scrollHeight;
            }
            
        } else if (data.type === 'success') {
            updateStatus('Addon Ready!', `Compilation successfully bundled.`, false);
            document.getElementById('progressContainer').classList.add('hidden');
            document.getElementById('timeEstimate').classList.add('hidden');
            
            const url = URL.createObjectURL(data.blob);
            downloadBtn.href = url;
            downloadBtn.download = data.fileName;
            downloadBtn.classList.remove('hidden');
            
            const rp = document.getElementById('resultsPanel');
            rp.classList.remove('hidden');
            const rg = document.getElementById('resultsGrid');
            const st = data.stats || {};
            
            rg.innerHTML = `
                <div>✅ ${st.textures || 0} Textures compiled</div>
                <div>✅ ${st.models || 0} Models parsed</div>
                <div>✅ ${st.items || 0} Items registered</div>
                <div>✅ ${st.blocks || 0} Blocks synthesized</div>
                <div>${st.recipes > 0 ? '✅ ' + st.recipes + ' Recipes' : '🟠 No recipes detected'}</div>
                <div>${st.animations > 0 ? '✅ ' + st.animations + ' Animations' : '🟠 No animations found'}</div>
                <div style="color: #F87171;">⚠️ ${st.classes || 0} Logic classes skipped</div>
                <div style="color: #F87171;">❌ ${data.warnings ? data.warnings.length : 0} Engine Parsing errors</div>
            `;
            
            displayWarnings(data.warnings);
            worker.terminate();
        } else if (data.type === 'error') {
            updateStatus('Conversion Failed', data.message || 'An error occurred during conversion.', false);
            document.getElementById('progressContainer').classList.add('hidden');
            document.getElementById('timeEstimate').classList.add('hidden');
            worker.terminate();
        }
    };

    worker.onerror = function(error) {
        updateStatus('Conversion Failed', 'A fatal worker error occurred.', false);
        console.error(error);
        worker.terminate();
    };

    worker.postMessage({ type: 'start', file: file, options: { convertModels, debugMode } });
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
