import { AIEngine } from "./ai-engine.js";

// Global variables
let currentBlobUrl = null;
let aiEngine = null;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusPanel = document.getElementById('statusPanel');
const spinner = document.getElementById('spinner');
const successIcon = document.getElementById('successIcon');
const errorIcon = document.getElementById('errorIcon');
const statusTitle = document.getElementById('statusTitle');
const statusDesc = document.getElementById('statusDesc');
const downloadBtn = document.getElementById('downloadBtn');
const downloadBtnText = document.getElementById('downloadBtnText');
const progressContainer = document.getElementById('progressContainer');
const progressBarFill = document.getElementById('progressBarFill');

const aiModelStatus = document.getElementById('aiModelStatus');
const aiModelLabel = document.getElementById('aiModelLabel');
const aiModelProgress = document.getElementById('aiModelProgress');

// Setup Drag & Drop Listeners
dropzone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
});

dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    e.target.value = '';
}, false);

async function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];

    if (!file.name.match(/\.(jar|zip)$/i)) {
        updateStatus("Fehler", "Bitte lade eine gültige .jar oder .zip Datei hoch.", 'error');
        return;
    }

    // Reset UI
    downloadBtn.classList.add('hidden');
    document.getElementById('errorsContainer')?.classList.add('hidden');
    updateStatus("Initialisierung", "KI-Modell wird vorbereitet...", 'loading');

    try {
        // Initialize AI Engine if needed
        if (!aiEngine) {
            aiModelStatus.classList.remove('hidden');
            aiEngine = new AIEngine((report) => {
                aiModelLabel.textContent = report.text;
                const progressMatch = report.text.match(/\[(\d+)\/(\d+)\]/);
                if (progressMatch) {
                    const progress = (parseInt(progressMatch[1]) / parseInt(progressMatch[2])) * 100;
                    aiModelProgress.style.width = `${progress}%`;
                }
            });
            await aiEngine.init();
            aiModelStatus.classList.add('hidden');
        }

        // Setup Context for conversion
        const ctx = {
            rpFolder: new JSZip(),
            bpFolder: new JSZip()
        };

        updateStatus("Konvertierung", "KI analysiert und transformiert Dateien...", 'loading');
        progressContainer.classList.remove('hidden');
        progressBarFill.style.width = '10%';

        // Start local conversion
        const result = await aiEngine.convert(file, ctx);

        progressBarFill.style.width = '100%';

        // Handle success
        const mcaddon = new JSZip();
        const rpZip = await ctx.rpFolder.generateAsync({ type: 'uint8array' });
        const bpZip = await ctx.bpFolder.generateAsync({ type: 'uint8array' });
        
        mcaddon.file(`${result.modName}_RP.mcpack`, rpZip);
        mcaddon.file(`${result.modName}_BP.mcpack`, bpZip);
        
        const finalBlob = await mcaddon.generateAsync({ type: 'blob' });
        
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = URL.createObjectURL(finalBlob);

        downloadBtn.href = currentBlobUrl;
        downloadBtn.download = `${result.modName}.mcaddon`;
        downloadBtn.classList.remove('hidden');

        let info = `\nÄhnlichkeit: ${result.similarity.percentage}% (${result.similarity.verdict.label})`;
        info += `\nKI-Schritte: ${result.iterations}`;
        
        updateStatus("Fertig!", "Das Addon wurde erfolgreich lokal generiert!" + info, 'success');
        
        setTimeout(() => progressContainer.classList.add('hidden'), 2000);

    } catch (error) {
        console.error('Local Conversion Error:', error);
        updateStatus("Fehler", error.message || "Ein lokaler Fehler ist aufgetreten.", 'error');
        aiModelStatus.classList.add('hidden');
        progressContainer.classList.add('hidden');
    }
}

function updateStatus(title, desc, statusObj = 'loading') {
    statusPanel.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;

    spinner.classList.add('hidden');
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');

    if (statusObj === 'loading') spinner.classList.remove('hidden');
    else if (statusObj === 'success') successIcon.classList.remove('hidden');
    else if (statusObj === 'error') errorIcon.classList.remove('hidden');
}

// Minimal Translation (re-using old keys)
const t = (key) => key; // Simplified for now as we focus on the AI logic

window.addEventListener('beforeunload', () => {
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
});
