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

    // Hide download button & errors on new upload
    downloadBtn.classList.add('hidden');
    const errorsContainer = document.getElementById('errorsContainer');
    if (errorsContainer) errorsContainer.classList.add('hidden');

    const worker = new Worker('worker.js');

    worker.onmessage = function (e) {
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
        } else if (data.type === 'success') {
            updateStatus('Addon Ready!', `Converted ${data.count} assets successfully!`, false);
            document.getElementById('progressContainer').classList.add('hidden');

            const url = URL.createObjectURL(data.blob);
            downloadBtn.href = url;
            downloadBtn.download = data.fileName;
            downloadBtn.classList.remove('hidden');

            displayWarnings(data.warnings);
            worker.terminate();
        } else if (data.type === 'error') {
            updateStatus('Conversion Failed', data.message || 'An error occurred during conversion.', false);
            document.getElementById('progressContainer').classList.add('hidden');
            worker.terminate();
        }
    };

    worker.onerror = function (error) {
        updateStatus('Conversion Failed', 'A fatal worker error occurred.', false);
        console.error(error);
        worker.terminate();
    };

    worker.postMessage({ type: 'start', file: file, options: { convertModels } });
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
// Translation System
const translations = {
    en: {
        title: "Jar to Bedrock Addon",
        subtitle: "Convert Java Minecraft Mods (.jar) to Bedrock Addons (.mcaddon) instantly.",
        dropzoneTitle: "Drag & Drop your .jar file here",
        dropzoneSubtitle: "or click to browse from your computer",
        dropzoneWarning: "Large mods (>100MB) may take significant time/RAM.",
        convertModels: "Convert Block Models to Geometry (Experimental)",
        downloadBtnText: "Download .mcaddon",
        errorsHeader: "Warnings & Errors",
        processing: "Processing...",
        readingDesc: "Reading file architecture",
        errorInvalidFile: "Please upload a valid .jar file.",
        errorLargeFileConfirm: "This file is heavily sized (>100MB). Extremely large modifications may hang or crash your browser tab during geometry extraction. Do you wish to continue?",
        addonReadyTitle: "Addon Ready!",
        addonReadyDesc: "Converted {count} assets successfully!",
        conversionFailedTitle: "Conversion Failed",
        conversionFailedFatal: "A fatal worker error occurred."
    },
    de: {
        title: "Jar zu Bedrock Addon",
        subtitle: "Konvertiere Java Minecraft Mods (.jar) sofort in Bedrock Addons (.mcaddon).",
        dropzoneTitle: "Ziehe deine .jar Datei hierher",
        dropzoneSubtitle: "oder klicke, um auf deinem Computer zu suchen",
        dropzoneWarning: "Große Mods (>100MB) können viel Zeit/RAM beanspruchen.",
        convertModels: "Blockmodelle in Geometrie konvertieren (Experimentell)",
        downloadBtnText: ".mcaddon Herunterladen",
        errorsHeader: "Warnungen & Fehler",
        processing: "Verarbeitung...",
        readingDesc: "Lese Dateistruktur",
        errorInvalidFile: "Bitte laden Sie eine gültige .jar Datei hoch.",
        errorLargeFileConfirm: "Diese Datei ist sehr groß (>100MB). Extrem große Modifikationen können den Browser-Tab während der Geometrie-Extraktion einfrieren oder zum Absturz bringen. Möchten Sie fortfahren?",
        addonReadyTitle: "Addon Bereit!",
        addonReadyDesc: "{count} Assets erfolgreich konvertiert!",
        conversionFailedTitle: "Konvertierung fehlgeschlagen",
        conversionFailedFatal: "Ein schwerwiegender Worker-Fehler ist aufgetreten."
    },
    fr: {
        title: "Jar vers Bedrock Addon",
        subtitle: "Convertissez instantanément les mods Java Minecraft (.jar) en Addons Bedrock (.mcaddon).",
        dropzoneTitle: "Glissez et déposez votre fichier .jar ici",
        dropzoneSubtitle: "ou cliquez pour parcourir votre ordinateur",
        dropzoneWarning: "Les gros mods (> 100 Mo) peuvent prendre beaucoup de temps / RAM.",
        convertModels: "Convertir les modèles de blocs en géométrie (Expérimental)",
        downloadBtnText: "Télécharger .mcaddon",
        errorsHeader: "Avertissements et erreurs",
        processing: "Traitement...",
        readingDesc: "Lecture de l'architecture des fichiers",
        errorInvalidFile: "Veuillez télécharger un fichier .jar valide.",
        errorLargeFileConfirm: "Ce fichier est très volumineux (> 100 Mo). Les modifications extrêmement importantes peuvent bloquer l'onglet. Voulez-vous continuer ?",
        addonReadyTitle: "Addon prêt !",
        addonReadyDesc: "{count} assets convertis avec succès !",
        conversionFailedTitle: "Échec de la conversion",
        conversionFailedFatal: "Une erreur fatale s'est produite."
    },
    es: {
        title: "Jar a Bedrock Addon",
        subtitle: "Convierte instantáneamente Mods de Java (.jar) en Bedrock Addons (.mcaddon).",
        dropzoneTitle: "Arrastra y suelta tu archivo .jar aquí",
        dropzoneSubtitle: "o haz clic para buscar en tu computadora",
        dropzoneWarning: "Los mods grandes (> 100 MB) pueden llevar mucho tiempo / RAM.",
        convertModels: "Convertir modelos de bloques a geometría (Experimental)",
        downloadBtnText: "Descargar .mcaddon",
        errorsHeader: "Advertencias y errores",
        processing: "Procesando...",
        readingDesc: "Leyendo la arquitectura del archivo",
        errorInvalidFile: "Sube un archivo .jar válido.",
        errorLargeFileConfirm: "Este archivo es muy grande (> 100 MB). Modificaciones extremadamente grandes pueden hacer que tu pestaña del navegador se bloquee. ¿Quieres continuar?",
        addonReadyTitle: "¡Addon Listo!",
        addonReadyDesc: "¡{count} activos convertidos exitosamente!",
        conversionFailedTitle: "Conversión Fallida",
        conversionFailedFatal: "Ocurrió un error fatal."
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
    let text = translations[currentLang][key] || translations['en'][key] || key;
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

function applyTranslations() {
    document.querySelector('header h1').textContent = t('title');
    document.querySelector('header p').textContent = t('subtitle');
    document.querySelector('.dropzone-content h3').textContent = t('dropzoneTitle');
    
    const dropzoneContentP = document.querySelectorAll('.dropzone-content p');
    if(dropzoneContentP.length >= 2) {
        dropzoneContentP[0].textContent = t('dropzoneSubtitle');
        dropzoneContentP[1].textContent = t('dropzoneWarning');
    }

    document.querySelector('.options-panel label span').textContent = t('convertModels');
    
    // Status panel translations IF specific texts are present
    if (statusTitle.textContent === translations['en']['processing'] || 
        statusTitle.textContent === translations['de']['processing'] ||
        statusTitle.textContent === translations['fr']['processing'] ||
        statusTitle.textContent === translations['es']['processing']) {
        statusTitle.textContent = t('processing');
    }

    const downloadSpan = document.querySelector('#downloadBtn span');
    if (downloadSpan) downloadSpan.textContent = t('downloadBtnText');
    
    const errorsHeaderH4 = document.querySelector('.errors-header h4');
    if (errorsHeaderH4) errorsHeaderH4.textContent = t('errorsHeader');
}
