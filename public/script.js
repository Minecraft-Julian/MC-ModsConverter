/**
 * MC Mods Converter v2 — Frontend Logic
 * Handles file upload, API communication, and UI state management.
 */

// ---- DOM Elements ----
const $ = id => document.getElementById(id);
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const uploadSection = $('uploadSection');
const conversionSection = $('conversionSection');
const resultSection = $('resultSection');
const errorSection = $('errorSection');
const aiLogEntries = $('aiLogEntries');
const progressFill = $('progressFill');
const downloadBtn = $('downloadBtn');
const statusDot = $('statusDot');
const statusLabel = $('statusLabel');

let currentBlobUrl = null;

// ---- AI Health Check ----
async function checkAIHealth() {
    statusDot.className = 'status-dot checking';
    statusLabel.textContent = 'Checking...';

    try {
        const res = await fetch('/api/health');
        const data = await res.json();

        if (data.status === 'online') {
            statusDot.className = 'status-dot online';
            statusLabel.textContent = `AI Online`;
        } else {
            statusDot.className = 'status-dot offline';
            statusLabel.textContent = 'AI Offline';
        }
    } catch {
        statusDot.className = 'status-dot offline';
        statusLabel.textContent = 'AI Offline';
    }
}

checkAIHealth();
setInterval(checkAIHealth, 30000);

// ---- Drag & Drop ----
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false)
);
['dragenter', 'dragover'].forEach(evt =>
    dropzone.addEventListener(evt, () => dropzone.classList.add('dragover'), false)
);
['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'), false)
);

dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    e.target.value = '';
}, false);

// ---- Convert Another ----
$('convertAnotherBtn')?.addEventListener('click', resetUI);
$('retryBtn')?.addEventListener('click', resetUI);

function resetUI() {
    uploadSection.classList.remove('hidden');
    conversionSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    aiLogEntries.innerHTML = '';
    progressFill.style.width = '0%';

    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }

    window.particleSystem?.stop();
}

// ---- File Handling ----
async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.match(/\.(jar|zip)$/i)) {
        showError('Invalid File', 'Please upload a .jar or .zip file.');
        return;
    }

    if (file.size > 200 * 1024 * 1024) {
        if (!confirm('This file is very large (>200MB). The AI conversion may take several minutes. Continue?')) {
            return;
        }
    }

    startConversion(file);
}

// ---- Conversion ----
async function startConversion(file) {
    // Switch to conversion view
    uploadSection.classList.add('hidden');
    conversionSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');

    // Start particles
    window.particleSystem?.start();

    // Reset log
    aiLogEntries.innerHTML = '';
    progressFill.style.width = '0%';

    addLogEntry('info', `Uploading ${file.name} (${formatSize(file.size)})...`);
    progressFill.style.width = '5%';

    try {
        // Upload file to API
        addLogEntry('info', 'Sending to AI conversion server...');
        progressFill.style.width = '10%';

        // Simulate progress while waiting
        const progressInterval = startProgressSimulation();

        const response = await fetch('/api/convert', {
            method: 'POST',
            headers: {
                'Content-Disposition': `attachment; filename="${file.name}"`,
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        clearInterval(progressInterval);
        progressFill.style.width = '90%';

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        addLogEntry('success', `Conversion complete in ${data.duration}`);
        progressFill.style.width = '100%';

        if (!data.success) {
            throw new Error(data.message || 'Conversion returned unsuccessful');
        }

        // Log AI activity
        if (data.ai) {
            addLogEntry('info', `AI used ${data.ai.toolCalls} tool calls in ${data.ai.iterations} iterations`);

            if (data.ai.toolStats?.toolUsage) {
                for (const [tool, usage] of Object.entries(data.ai.toolStats.toolUsage)) {
                    addLogEntry('tool', `${tool}: ${usage.calls}x (${usage.successes} OK, ${usage.failures} failed)`);
                }
            }
        }

        // Show results after a brief delay for animation
        setTimeout(() => showResults(data), 800);

    } catch (error) {
        window.particleSystem?.stop();
        console.error('Conversion error:', error);
        addLogEntry('error', error.message);

        setTimeout(() => {
            conversionSection.classList.add('hidden');
            showError('Conversion Failed', error.message);
        }, 1000);
    }
}

function startProgressSimulation() {
    let progress = 10;
    const steps = [
        { at: 15, msg: 'AI scanning mod structure...' },
        { at: 25, msg: 'Analyzing textures and models...' },
        { at: 35, msg: 'Converting assets to Bedrock format...' },
        { at: 45, msg: 'Processing blockstates and recipes...' },
        { at: 55, msg: 'Generating Script API logic...' },
        { at: 65, msg: 'Running validation checks...' },
        { at: 75, msg: 'Calculating similarity score...' },
        { at: 82, msg: 'Packaging .mcaddon...' }
    ];

    let stepIndex = 0;

    return setInterval(() => {
        if (progress < 85) {
            progress += 0.3 + Math.random() * 0.5;
            progressFill.style.width = `${Math.min(progress, 85)}%`;

            if (stepIndex < steps.length && progress >= steps[stepIndex].at) {
                addLogEntry('info', steps[stepIndex].msg);
                stepIndex++;
            }
        }
    }, 500);
}

// ---- Results Display ----
function showResults(data) {
    conversionSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    window.particleSystem?.stop();

    // Title & subtitle
    $('resultTitle').textContent = 'Addon Ready!';
    $('resultSubtitle').textContent = `${data.modName} — ${data.duration} — ${formatSize(data.fileSize)}`;

    // Similarity Ring
    const percentage = data.similarity?.percentage || 0;
    animateSimilarityRing(percentage);

    const verdict = data.similarity?.verdict;
    if (verdict) {
        $('similarityVerdict').textContent = `${verdict.emoji} ${verdict.label} — ${verdict.description}`;
    }

    // Score Breakdown
    const breakdownEl = $('scoreBreakdown');
    breakdownEl.innerHTML = '';

    if (data.similarity?.breakdown) {
        const categories = {
            textures: 'Textures',
            models: 'Models',
            blocks: 'Blocks',
            recipes: 'Recipes',
            sounds: 'Sounds',
            logic: 'Logic'
        };

        for (const [key, label] of Object.entries(categories)) {
            const cat = data.similarity.breakdown[key];
            if (!cat || cat.score === undefined) continue;

            const row = document.createElement('div');
            row.className = 'score-row';
            row.innerHTML = `
                <span class="score-label">${label}</span>
                <div class="score-bar-track">
                    <div class="score-bar-fill" style="width: 0%"></div>
                </div>
                <span class="score-value">${Math.round(cat.score)}%</span>
            `;
            breakdownEl.appendChild(row);

            // Animate bar
            setTimeout(() => {
                row.querySelector('.score-bar-fill').style.width = `${cat.score}%`;
            }, 300);
        }
    }

    // AI Stats
    const statsEl = $('aiStats');
    statsEl.innerHTML = '';

    const stats = [
        { value: data.ai?.toolCalls || 0, label: 'Tool Calls' },
        { value: data.ai?.iterations || 0, label: 'Iterations' },
        { value: `${data.validation?.attempts || 1}x`, label: 'Validations' }
    ];

    for (const stat of stats) {
        const box = document.createElement('div');
        box.className = 'stat-box';
        box.innerHTML = `
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
        statsEl.appendChild(box);
    }

    // Download button
    if (data.fileBase64) {
        const byteChars = atob(data.fileBase64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });

        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = URL.createObjectURL(blob);

        downloadBtn.href = currentBlobUrl;
        downloadBtn.download = data.fileName || 'converted.mcaddon';

        downloadBtn.onclick = () => {
            setTimeout(() => {
                if (currentBlobUrl) {
                    URL.revokeObjectURL(currentBlobUrl);
                    currentBlobUrl = null;
                }
            }, 3000);
        };
    }

    // Warnings
    const warningsPanel = $('warningsPanel');
    const warningsList = $('warningsList');

    if (data.validation && (data.validation.errors > 0 || data.validation.warnings > 0)) {
        warningsPanel.classList.remove('hidden');
        $('warningsCount').textContent = `${data.validation.errors} errors, ${data.validation.warnings} warnings`;
        warningsList.innerHTML = '';
        // We don't have detailed warnings in this response shape, but the panel is ready
    } else {
        warningsPanel.classList.add('hidden');
    }
}

function animateSimilarityRing(percentage) {
    const ringFill = $('ringFill');
    const ringPercent = $('ringPercent');
    const circumference = 2 * Math.PI * 52; // r=52

    // Add SVG gradient definition if not present
    const svg = ringFill?.closest('svg');
    if (svg && !svg.querySelector('#ringGradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: #7c5cfc"/>
                <stop offset="100%" style="stop-color: #38bdf8"/>
            </linearGradient>
        `;
        svg.prepend(defs);
    }

    // Animate ring
    const targetOffset = circumference - (circumference * percentage / 100);
    setTimeout(() => {
        if (ringFill) ringFill.style.strokeDashoffset = targetOffset;
    }, 200);

    // Animate counter
    let current = 0;
    const step = percentage / 40;
    const counter = setInterval(() => {
        current += step;
        if (current >= percentage) {
            current = percentage;
            clearInterval(counter);
        }
        if (ringPercent) ringPercent.textContent = Math.round(current);
    }, 30);
}

// ---- Error Display ----
function showError(title, message) {
    errorSection.classList.remove('hidden');
    $('errorTitle').textContent = title;
    $('errorMessage').textContent = message;
}

// ---- Log Entries ----
function addLogEntry(type, message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let icon = '';
    let cssClass = 'log-info';
    switch (type) {
        case 'tool': icon = '🔧'; cssClass = 'log-tool'; break;
        case 'success': icon = '✅'; cssClass = 'log-success'; break;
        case 'error': icon = '❌'; cssClass = 'log-error'; break;
        case 'info': default: icon = '▸'; cssClass = 'log-info'; break;
    }

    entry.innerHTML = `<span class="log-info">${time}</span> ${icon} <span class="${cssClass}">${escapeHtml(message)}</span>`;
    aiLogEntries.appendChild(entry);
    aiLogEntries.scrollTop = aiLogEntries.scrollHeight;

    // Update header title
    const logTitle = $('aiLogTitle');
    if (logTitle) logTitle.textContent = message.substring(0, 60);
}

// ---- Utilities ----
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ---- Cleanup ----
window.addEventListener('beforeunload', () => {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
});

// ---- Translation System (simplified) ----
const translations = {
    en: {
        dropTitle: 'Drop your .jar file here',
        dropSub: 'or click to browse',
        addonReady: 'Addon Ready!',
        downloadBtn: 'Download .mcaddon',
        convertAnother: 'Convert Another Mod',
        conversionFailed: 'Conversion Failed'
    },
    de: {
        dropTitle: 'Ziehe deine .jar Datei hierher',
        dropSub: 'oder klicke zum Durchsuchen',
        addonReady: 'Addon Bereit!',
        downloadBtn: '.mcaddon Herunterladen',
        convertAnother: 'Weiteren Mod konvertieren',
        conversionFailed: 'Konvertierung fehlgeschlagen'
    }
};

let currentLang = 'en';
const langSelect = $('langSelect');

if (langSelect) {
    // Detect browser language
    const browserLang = (navigator.language || 'en').split('-')[0];
    if (translations[browserLang]) {
        currentLang = browserLang;
        langSelect.value = currentLang;
    }

    langSelect.addEventListener('change', e => {
        currentLang = e.target.value;
        applyTranslations();
    });
}

function t(key) {
    return translations[currentLang]?.[key] || translations.en[key] || key;
}

function applyTranslations() {
    const dropTitle = $('dropzoneTitle');
    const dropSub = $('dropzoneSubtitle');
    const dlBtn = $('downloadBtnText');

    if (dropTitle) dropTitle.textContent = t('dropTitle');
    if (dropSub) dropSub.textContent = t('dropSub');
    if (dlBtn) dlBtn.textContent = t('downloadBtn');
}

applyTranslations();
