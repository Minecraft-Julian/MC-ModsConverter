// Global variables
let currentBlobUrl = null; // Track the active blob URL so it can be revoked
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
const locationNoticeTitle = document.getElementById('locationNoticeTitle');
const locationNoticeText = document.getElementById('locationNoticeText');
const progressContainer = document.getElementById('progressContainer');
const progressBarFill = document.getElementById('progressBarFill');

const dropzoneTitle = document.querySelector('.dropzone h3');

// Setup Drag & Drop Listeners
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

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
    dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'), false);
});

// Wait, fixed the typo in ['dragleave', 'drop'] loop above
['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
});

dropzone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
}, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Revoke active blob URL when the page is unloaded to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
});

async function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];

    if (!file.name.endsWith('.jar') && !file.name.endsWith('.zip')) {
        updateStatus(t('conversionFailedTitle'), t('errorInvalidFile'), 'error');
        return;
    }

    if (file.size > 100 * 1024 * 1024) { // over 100mb
        if (!confirm(t('errorLargeFileConfirm'))) {
            return;
        }
    }

    // Hide download button & errors on new conversion
    downloadBtn.classList.add('hidden');
    const errorsContainer = document.getElementById('errorsContainer');
    if (errorsContainer) errorsContainer.classList.add('hidden');

    // UI Feedback: Start conversion
    updateStatus(t('processing'), t('readingDesc'), 'loading');
    progressContainer.classList.remove('hidden');
    progressBarFill.style.width = '10%';

    try {
        // Start a progress simulation for better UX since AI takes time
        const simInterval = setInterval(() => {
            const currentWidth = parseFloat(progressBarFill.style.width);
            if (currentWidth < 90) {
                progressBarFill.style.width = (currentWidth + (90 - currentWidth) * 0.05) + '%';
            }
        }, 800);

        // Call the Vercel AI API
        const response = await fetch('/api/convert', {
            method: 'POST',
            headers: {
                'Content-Disposition': `attachment; filename="${file.name}"`,
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        clearInterval(simInterval);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
            throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Conversion failed on server');
        }

        progressBarFill.style.width = '100%';

        // Success Feedback
        let infoText = `\nJava similarity: ${data.similarity.percentage}% (${data.similarity.verdict.label})`;
        if (data.ai) {
            infoText += `\nAI used ${data.ai.toolCalls} tools in ${data.ai.iterations} steps.`;
        }
        
        updateStatus(t('addonReadyTitle'), t('addonReadyDesc', {count: data.javaAnalysis.totalTextures + data.javaAnalysis.totalModels}) + infoText, 'success');
        
        setTimeout(() => {
            progressContainer.classList.add('hidden');
        }, 1000);

        // Handle Download
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
        }

        // Convert base64 from API back to blob
        const byteChars = atob(data.fileBase64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        
        currentBlobUrl = URL.createObjectURL(blob);
        downloadBtn.href = currentBlobUrl;
        downloadBtn.download = data.fileName;
        downloadBtn.classList.remove('hidden');

        downloadBtn.onclick = () => {
            setTimeout(() => {
                if (currentBlobUrl) {
                    URL.revokeObjectURL(currentBlobUrl);
                    currentBlobUrl = null;
                    downloadBtn.href = '#';
                }
            }, 3000);
        };

        // Display validation errors as warnings
        if (data.validation && data.validation.errors > 0) {
            displayWarnings([`Validation failed with ${data.validation.errors} errors. See logs for details.`]);
        }

    } catch (error) {
        console.error('Conversion error:', error);
        updateStatus(t('conversionFailedTitle'), error.message || t('conversionFailedFatal'), 'error');
        progressContainer.classList.add('hidden');
    }
}

function displayWarnings(warnings) {
    const container = document.getElementById('errorsContainer');
    const list = document.getElementById('errorsList');
    if (!container || !list) return;

    list.innerHTML = '';
    if (!warnings || warnings.length === 0) {
        container.classList.add('hidden');
        return;
    }

    warnings.forEach(warning => {
        const li = document.createElement('li');
        li.textContent = typeof warning === 'string' ? warning : (warning.message || JSON.stringify(warning));
        list.appendChild(li);
    });

    container.classList.remove('hidden');
}

function updateStatus(title, desc, statusObj = 'loading') {
    statusPanel.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;

    spinner.classList.add('hidden');
    successIcon.classList.add('hidden');
    if (errorIcon) errorIcon.classList.add('hidden');

    if (statusObj === 'loading' || statusObj === true) {
        spinner.classList.remove('hidden');
    } else if (statusObj === 'success' || statusObj === false) {
        successIcon.classList.remove('hidden');
    } else if (statusObj === 'error' && errorIcon) {
        errorIcon.classList.remove('hidden');
    }
}

// Translation System
const translations = {
    en: {
        title: "Jar to Bedrock Addon",
        subtitle: "Convert Java Minecraft Mods (.jar) to Bedrock Addons (.mcaddon) instantly.",
        locationNoticeTitle: "Automatic language suggestion",
        locationNoticeText: "We only use rough browser country/region hints to suggest a language, never precise location, and we do not store it.",
        dropzoneTitle: "Drag & Drop your .jar file here",
        dropzoneSubtitle: "or click to browse from your computer",
        dropzoneWarning: "Large mods (>100MB) may take significant time/RAM.",
        downloadBtnText: "Download .mcaddon",
        errorsHeader: "Warnings & Errors",
        processing: "Processing...",
        readingDesc: "AI is analyzing and converting...",
        errorInvalidFile: "Please upload a valid .jar file.",
        errorLargeFileConfirm: "This file is heavily sized (>100MB). AI conversion may take several minutes. Do you wish to continue?",
        addonReadyTitle: "Addon Ready!",
        addonReadyDesc: "Converted assets successfully!",
        conversionFailedTitle: "Conversion Failed",
        conversionFailedFatal: "A fatal error occurred during conversion."
    },
    de: {
        title: "Jar zu Bedrock Addon",
        subtitle: "Konvertiere Java Minecraft Mods (.jar) sofort in Bedrock Addons (.mcaddon).",
        locationNoticeTitle: "Automatische Sprachwahl",
        locationNoticeText: "Wir nutzen nur grobe Browser-Länder-/Regionshinweise für einen Sprachvorschlag, niemals einen genauen Standort, und speichern das nicht.",
        dropzoneTitle: "Ziehe deine .jar Datei hierher",
        dropzoneSubtitle: "oder klicke, um auf deinem Computer zu suchen",
        dropzoneWarning: "Große Mods (>100MB) können viel Zeit/RAM beanspruchen.",
        downloadBtnText: ".mcaddon Herunterladen",
        errorsHeader: "Warnungen & Fehler",
        processing: "Verarbeitung...",
        readingDesc: "KI analysiert und konvertiert...",
        errorInvalidFile: "Bitte laden Sie eine gültige .jar Datei hoch.",
        errorLargeFileConfirm: "Diese Datei ist sehr groß (>100MB). Die KI-Konvertierung kann einige Minuten dauern. Möchten Sie fortfahren?",
        addonReadyTitle: "Addon Bereit!",
        addonReadyDesc: "Assets erfolgreich konvertiert!",
        conversionFailedTitle: "Konvertierung fehlgeschlagen",
        conversionFailedFatal: "Ein schwerwiegender Fehler ist aufgetreten."
    }
};

let currentLang = 'en';
const langSelect = document.getElementById('langSelect');
if (langSelect) {
    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        applyTranslations();
    });
}

function t(key, replacements = {}) {
    let text = (translations[currentLang] && translations[currentLang][key]) || translations['en'][key] || key;
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelector('header h1').textContent = t('title');
    document.querySelector('header p').textContent = t('subtitle');
    document.querySelector('.dropzone-content h3').textContent = t('dropzoneTitle');

    const dropzoneContentP = document.querySelectorAll('.dropzone-content p');
    if(dropzoneContentP.length >= 2) {
        dropzoneContentP[0].textContent = t('dropzoneSubtitle');
        dropzoneContentP[1].textContent = t('dropzoneWarning');
    }

    if (locationNoticeTitle && locationNoticeText) {
        locationNoticeTitle.textContent = t('locationNoticeTitle');
        locationNoticeText.textContent = t('locationNoticeText');
    }

    const downloadSpan = document.querySelector('#downloadBtn span');
    if (downloadSpan) downloadSpan.textContent = t('downloadBtnText');
    
    const errorsHeaderH4 = document.querySelector('.errors-header h4');
    if (errorsHeaderH4) errorsHeaderH4.textContent = t('errorsHeader');

    if (langSelect) langSelect.value = currentLang;
}

// Simple language detection
const browserLang = (navigator.language || 'en').split('-')[0];
if (translations[browserLang]) {
    currentLang = browserLang;
}
applyTranslations();
