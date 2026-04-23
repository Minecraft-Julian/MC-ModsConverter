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

const dropzoneTitle = document.querySelector('.dropzone h3');

dropzoneTitle.textContent = 'Drag & Drop your .jar file here';
downloadBtnText.textContent = 'Download .mcaddon';

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
        updateStatus('Error', t('errorInvalidFile'), 'error');
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

    const worker = new Worker('worker.js');

    worker.onmessage = function (e) {
        const data = e.data;
        if (data.type === 'status') {
            updateStatus(data.title, data.desc, data.isLoading ? 'loading' : 'success');
            const progressContainer = document.getElementById('progressContainer');
            const progressBarFill = document.getElementById('progressBarFill');
            if (data.percent !== undefined) {
                progressContainer.classList.remove('hidden');
                progressBarFill.style.width = `${data.percent}%`;
            } else {
                progressContainer.classList.add('hidden');
            }
        } else if (data.type === 'success') {
            let infoText = '';
            if (data.accuracy !== undefined) {
                infoText += `\nJava similarity: ${data.accuracy}%`;
            }
            if (data.conversionStats) {
                const converted = data.conversionStats.classFilesConverted || 0;
                const total = data.structureSummary ? data.structureSummary.classFiles : 0;
                if (total > 0) {
                    infoText += `\nScript stubs: ${converted} / ${total} .class files converted`;
                }
            }
            updateStatus(t('addonReadyTitle'), t('addonReadyDesc', {count: data.count}) + infoText, 'success');
            document.getElementById('progressContainer').classList.add('hidden');
            // Revoke any previous blob URL before creating a new one
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
            currentBlobUrl = URL.createObjectURL(data.blob);
            downloadBtn.href = currentBlobUrl;
            downloadBtn.download = data.fileName;
            downloadBtn.classList.remove('hidden');
            // Revoke the blob URL shortly after the user clicks download to free RAM
            downloadBtn.onclick = () => {
                // Revoke the blob URL after a short delay to give the browser time to
                // initiate the download before the object URL becomes invalid.
                // 2 000 ms is sufficient for all major browsers on slow connections.
                setTimeout(() => {
                    if (currentBlobUrl) {
                        URL.revokeObjectURL(currentBlobUrl);
                        currentBlobUrl = null;
                        downloadBtn.href = '#';
                    }
                }, 2000);
            };

            displayWarnings(data.warnings);
            worker.terminate();
        } else if (data.type === 'error') {
            updateStatus(t('conversionFailedTitle'), data.message || t('conversionFailedFatal'), 'error');
            document.getElementById('progressContainer').classList.add('hidden');
            displayWarnings(data.warnings);
            worker.terminate();
        }
    };

    worker.onerror = function (error) {
        const errorMsg = error.message ? `${t('conversionFailedFatal')}\n${error.message}` : t('conversionFailedFatal');
        updateStatus(t('conversionFailedTitle'), errorMsg, 'error');
        console.error('Worker error:', error);
        worker.terminate();
    };

    // Read file as ArrayBuffer and transfer it zero-copy to the worker
    let arrayBuffer;
    try {
        arrayBuffer = await file.arrayBuffer();
    } catch (err) {
        updateStatus(t('conversionFailedTitle'), `Failed to read file: ${err.message}`, 'error');
        worker.terminate();
        return;
    }
    worker.postMessage(
        { type: 'start', fileName: file.name, arrayBuffer, options: { convertModels: true } },
        [arrayBuffer]
    );
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

    const groupedWarnings = groupWarningsByError(warnings);
    groupedWarnings.forEach(group => {
        if (group.entries.length === 1) {
            const li = document.createElement('li');
            li.textContent = group.message;
            list.appendChild(li);
            return;
        }

        const li = document.createElement('li');
        li.className = 'warning-group-item';

        const details = document.createElement('details');
        details.className = 'warning-group';

        const summary = document.createElement('summary');
        summary.className = 'warning-group-summary';

        const message = document.createElement('span');
        message.className = 'warning-group-message';
        message.textContent = group.message;

        const count = document.createElement('span');
        count.className = 'warning-group-count';
        count.textContent = `${group.entries.length}×`;

        summary.append(message, count);

        const nestedList = document.createElement('ul');
        nestedList.className = 'warning-group-list';

        group.entries.forEach(entry => {
            const nestedItem = document.createElement('li');
            nestedItem.textContent = formatWarningMessage(entry);
            nestedList.appendChild(nestedItem);
        });

        details.append(summary, nestedList);
        li.appendChild(details);
        list.appendChild(li);
    });

    container.classList.remove('hidden');
}

function groupWarningsByError(warnings) {
    const groups = new Map();

    warnings.forEach(warning => {
        const message = formatWarningMessage(warning);
        if (!groups.has(message)) {
            groups.set(message, {
                message,
                entries: []
            });
        }
        groups.get(message).entries.push(warning);
    });

    return Array.from(groups.values());
}

function formatWarningMessage(warning) {
    if (!warning) return 'Unknown warning';
    if (typeof warning === 'string') return warning;

    const message = warning.error || String(warning);
    return warning.path ? `[${warning.path}] ${message}` : message;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
        convertModels: "Convert Block Models to Geometry (Experimental)",
        downloadBtnText: "Download .mcaddon",
        errorsHeader: "Warnings & Errors",
        achievementBookButton: "Open Achievement Book",
        achievementBookTitle: "Achievement Book",
        achievementBookSubtitle: "Track what you have unlocked while using the converter.",
        achievementUnlocked: "Unlocked",
        achievementLocked: "Locked",
        achievementWelcomeTitle: "First Spawn",
        achievementWelcomeDesc: "Open the converter and start your session.",
        achievementBookwormTitle: "Bookworm",
        achievementBookwormDesc: "Open the achievement book.",
        achievementLinguistTitle: "Linguist",
        achievementLinguistDesc: "Let the app pick a language automatically or switch it yourself.",
        achievementUploaderTitle: "Mod Courier",
        achievementUploaderDesc: "Select a Java mod to begin conversion.",
        achievementCreatorTitle: "Addon Crafter",
        achievementCreatorDesc: "Finish a conversion successfully.",
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
        locationNoticeTitle: "Automatische Sprachwahl",
        locationNoticeText: "Wir nutzen nur grobe Browser-Länder-/Regionshinweise für einen Sprachvorschlag, niemals einen genauen Standort, und speichern das nicht.",
        dropzoneTitle: "Ziehe deine .jar Datei hierher",
        dropzoneSubtitle: "oder klicke, um auf deinem Computer zu suchen",
        dropzoneWarning: "Große Mods (>100MB) können viel Zeit/RAM beanspruchen.",
        convertModels: "Blockmodelle in Geometrie konvertieren (Experimentell)",
        downloadBtnText: ".mcaddon Herunterladen",
        errorsHeader: "Warnungen & Fehler",
        achievementBookButton: "Achievement-Buch öffnen",
        achievementBookTitle: "Achievement-Buch",
        achievementBookSubtitle: "Verfolge, was du während der Nutzung des Converters freigeschaltet hast.",
        achievementUnlocked: "Freigeschaltet",
        achievementLocked: "Gesperrt",
        achievementWelcomeTitle: "Erster Spawn",
        achievementWelcomeDesc: "Öffne den Converter und starte deine Sitzung.",
        achievementBookwormTitle: "Bücherwurm",
        achievementBookwormDesc: "Öffne das Achievement-Buch.",
        achievementLinguistTitle: "Sprachkundig",
        achievementLinguistDesc: "Lass die App automatisch eine Sprache wählen oder ändere sie selbst.",
        achievementUploaderTitle: "Mod-Kurier",
        achievementUploaderDesc: "Wähle eine Java-Mod aus, um die Konvertierung zu starten.",
        achievementCreatorTitle: "Addon-Schmied",
        achievementCreatorDesc: "Schließe eine Konvertierung erfolgreich ab.",
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
    },
    it: {
        title: "Jar a Bedrock Addon",
        subtitle: "Converti istantaneamente i Mod Java Minecraft (.jar) in Addon Bedrock (.mcaddon).",
        dropzoneTitle: "Trascina e rilascia il tuo file .jar qui",
        dropzoneSubtitle: "o fai clic per sfogliare il tuo computer",
        dropzoneWarning: "I mod grandi (>100MB) possono richiedere molto tempo/RAM.",
        convertModels: "Converti modelli di blocco in geometria (Sperimentale)",
        downloadBtnText: "Scarica .mcaddon",
        errorsHeader: "Avvertimenti ed errori",
        processing: "Elaborazione...",
        readingDesc: "Lettura architettura file",
        errorInvalidFile: "Carica un file .jar valido.",
        errorLargeFileConfirm: "Questo file è molto grande (>100MB). Modifiche estremamente grandi possono bloccare la scheda del browser. Vuoi continuare?",
        addonReadyTitle: "Addon Pronto!",
        addonReadyDesc: "{count} risorse convertite con successo!",
        conversionFailedTitle: "Conversione Fallita",
        conversionFailedFatal: "Si è verificato un errore fatale."
    },
    pt: {
        title: "Jar para Bedrock Addon",
        subtitle: "Converta Mods Java Minecraft (.jar) para Addons Bedrock (.mcaddon) instantaneamente.",
        dropzoneTitle: "Arraste e solte seu arquivo .jar aqui",
        dropzoneSubtitle: "ou clique para navegar no seu computador",
        dropzoneWarning: "Mods grandes (>100MB) podem levar muito tempo/RAM.",
        convertModels: "Converter Modelos de Bloco para Geometria (Experimental)",
        downloadBtnText: "Baixar .mcaddon",
        errorsHeader: "Avisos e Erros",
        processing: "Processando...",
        readingDesc: "Lendo arquitetura do arquivo",
        errorInvalidFile: "Faça upload de um arquivo .jar válido.",
        errorLargeFileConfirm: "Este arquivo é muito grande (>100MB). Modificações extremamente grandes podem travar a aba do navegador. Deseja continuar?",
        addonReadyTitle: "Addon Pronto!",
        addonReadyDesc: "{count} recursos convertidos com sucesso!",
        conversionFailedTitle: "Conversão Falhou",
        conversionFailedFatal: "Ocorreu um erro fatal."
    },
    ru: {
        title: "Jar в Bedrock Addon",
        subtitle: "Мгновенно конвертируйте моды Java Minecraft (.jar) в аддоны Bedrock (.mcaddon).",
        dropzoneTitle: "Перетащите ваш .jar файл сюда",
        dropzoneSubtitle: "или нажмите, чтобы просмотреть на вашем компьютере",
        dropzoneWarning: "Большие моды (>100MB) могут занять значительное время/ОЗУ.",
        convertModels: "Преобразовать модели блоков в геометрию (Экспериментально)",
        downloadBtnText: "Скачать .mcaddon",
        errorsHeader: "Предупреждения и ошибки",
        processing: "Обработка...",
        readingDesc: "Чтение архитектуры файла",
        errorInvalidFile: "Пожалуйста, загрузите действительный .jar файл.",
        errorLargeFileConfirm: "Этот файл очень большой (>100MB). Крайне большие модификации могут зависнуть или аварийно завершить работу вкладки браузера. Хотите продолжить?",
        addonReadyTitle: "Аддон Готов!",
        addonReadyDesc: "{count} ресурсов успешно конвертировано!",
        conversionFailedTitle: "Конвертация Не Удалась",
        conversionFailedFatal: "Произошла фатальная ошибка."
    },
    zh: {
        title: "Jar 到 Bedrock 插件",
        subtitle: "即时将 Java Minecraft 模组 (.jar) 转换为 Bedrock 插件 (.mcaddon)。",
        dropzoneTitle: "将您的 .jar 文件拖放到此处",
        dropzoneSubtitle: "或点击浏览您的计算机",
        dropzoneWarning: "大型模组 (>100MB) 可能需要大量时间/内存。",
        convertModels: "将方块模型转换为几何体 (实验性)",
        downloadBtnText: "下载 .mcaddon",
        errorsHeader: "警告和错误",
        processing: "处理中...",
        readingDesc: "读取文件架构",
        errorInvalidFile: "请上传有效的 .jar 文件。",
        errorLargeFileConfirm: "此文件非常大 (>100MB)。极其大的修改可能会挂起或崩溃浏览器标签页。您要继续吗？",
        addonReadyTitle: "插件就绪！",
        addonReadyDesc: "成功转换 {count} 个资源！",
        conversionFailedTitle: "转换失败",
        conversionFailedFatal: "发生致命错误。"
    },
    ja: {
        title: "Jar から Bedrock アドオンへ",
        subtitle: "Java Minecraft モッド (.jar) を Bedrock アドオン (.mcaddon) に即座に変換。",
        dropzoneTitle: ".jar ファイルをここにドラッグ＆ドロップ",
        dropzoneSubtitle: "またはクリックしてコンピュータを閲覧",
        dropzoneWarning: "大きなモッド (>100MB) はかなりの時間/メモリを必要とするかもしれません。",
        convertModels: "ブロックモデルをジオメトリに変換 (実験的)",
        downloadBtnText: ".mcaddon をダウンロード",
        errorsHeader: "警告とエラー",
        processing: "処理中...",
        readingDesc: "ファイルアーキテクチャの読み取り",
        errorInvalidFile: "有効な .jar ファイルをアップロードしてください。",
        errorLargeFileConfirm: "このファイルは非常に大きい (>100MB)。極端に大きな変更はブラウザタブをハングアップまたはクラッシュさせる可能性があります。続行しますか？",
        addonReadyTitle: "アドオン準備完了！",
        addonReadyDesc: "{count} 個のアセットを正常に変換！",
        conversionFailedTitle: "変換失敗",
        conversionFailedFatal: "致命的なエラーが発生しました。"
    },
    ko: {
        title: "Jar에서 Bedrock 애드온으로",
        subtitle: "Java Minecraft 모드 (.jar)를 Bedrock 애드온 (.mcaddon)으로 즉시 변환하세요.",
        dropzoneTitle: ".jar 파일을 여기로 드래그 앤 드롭",
        dropzoneSubtitle: "또는 클릭하여 컴퓨터에서 탐색",
        dropzoneWarning: "큰 모드 (>100MB)는 상당한 시간/RAM을 필요로 할 수 있습니다.",
        convertModels: "블록 모델을 지오메트리로 변환 (실험적)",
        downloadBtnText: ".mcaddon 다운로드",
        errorsHeader: "경고 및 오류",
        processing: "처리 중...",
        readingDesc: "파일 아키텍처 읽기",
        errorInvalidFile: "유효한 .jar 파일을 업로드하세요.",
        errorLargeFileConfirm: "이 파일은 매우 큽니다 (>100MB). 극도로 큰 수정은 브라우저 탭을 중단시키거나 충돌시킬 수 있습니다. 계속하시겠습니까?",
        addonReadyTitle: "애드온 준비 완료!",
        addonReadyDesc: "{count} 개 자산을 성공적으로 변환!",
        conversionFailedTitle: "변환 실패",
        conversionFailedFatal: "치명적인 오류가 발생했습니다."
    },
    nl: {
        title: "Jar naar Bedrock Addon",
        subtitle: "Converteer Java Minecraft Mods (.jar) direct naar Bedrock Addons (.mcaddon).",
        dropzoneTitle: "Sleep je .jar bestand hierheen",
        dropzoneSubtitle: "of klik om op je computer te bladeren",
        dropzoneWarning: "Grote mods (>100MB) kunnen veel tijd/RAM kosten.",
        convertModels: "Converteer Blokmodellen naar Geometrie (Experimenteel)",
        downloadBtnText: ".mcaddon Downloaden",
        errorsHeader: "Waarschuwingen & Fouten",
        processing: "Verwerken...",
        readingDesc: "Bestandsarchitectuur lezen",
        errorInvalidFile: "Upload een geldig .jar bestand.",
        errorLargeFileConfirm: "Dit bestand is erg groot (>100MB). Extreem grote modificaties kunnen de browsertab laten hangen of crashen. Wilt u doorgaan?",
        addonReadyTitle: "Addon Klaar!",
        addonReadyDesc: "{count} assets succesvol geconverteerd!",
        conversionFailedTitle: "Conversie Mislukt",
        conversionFailedFatal: "Er is een fatale fout opgetreden."
    },
    sv: {
        title: "Jar till Bedrock Addon",
        subtitle: "Konvertera Java Minecraft Mods (.jar) till Bedrock Addons (.mcaddon) direkt.",
        dropzoneTitle: "Dra och släpp din .jar fil här",
        dropzoneSubtitle: "eller klicka för att bläddra på din dator",
        dropzoneWarning: "Stora mods (>100MB) kan ta betydande tid/RAM.",
        convertModels: "Konvertera Blockmodeller till Geometri (Experimentellt)",
        downloadBtnText: "Ladda ner .mcaddon",
        errorsHeader: "Varningar & Fel",
        processing: "Bearbetar...",
        readingDesc: "Läser filarkitektur",
        errorInvalidFile: "Ladda upp en giltig .jar fil.",
        errorLargeFileConfirm: "Denna fil är mycket stor (>100MB). Extremt stora modifieringar kan hänga eller krascha webbläsarfliken. Vill du fortsätta?",
        addonReadyTitle: "Addon Klar!",
        addonReadyDesc: "{count} tillgångar konverterade framgångsrikt!",
        conversionFailedTitle: "Konvertering Misslyckades",
        conversionFailedFatal: "Ett fatalt fel inträffade."
    },
    da: {
        title: "Jar til Bedrock Addon",
        subtitle: "Konverter Java Minecraft Mods (.jar) til Bedrock Addons (.mcaddon) øjeblikkeligt.",
        dropzoneTitle: "Træk og slip din .jar fil her",
        dropzoneSubtitle: "eller klik for at gennemse på din computer",
        dropzoneWarning: "Store mods (>100MB) kan tage betydelig tid/RAM.",
        convertModels: "Konverter Blokmodeller til Geometri (Eksperimentelt)",
        downloadBtnText: "Download .mcaddon",
        errorsHeader: "Advarsler & Fejl",
        processing: "Behandler...",
        readingDesc: "Læser filarkitektur",
        errorInvalidFile: "Upload en gyldig .jar fil.",
        errorLargeFileConfirm: "Denne fil er meget stor (>100MB). Ekstremt store modifikationer kan hænge eller crashe browserfanen. Ønsker du at fortsætte?",
        addonReadyTitle: "Addon Klar!",
        addonReadyDesc: "{count} aktiver konverteret succesfuldt!",
        conversionFailedTitle: "Konvertering Mislykkedes",
        conversionFailedFatal: "En fatal fejl opstod."
    },
    no: {
        title: "Jar til Bedrock Addon",
        subtitle: "Konverter Java Minecraft Mods (.jar) til Bedrock Addons (.mcaddon) øyeblikkelig.",
        dropzoneTitle: "Dra og slipp din .jar fil her",
        dropzoneSubtitle: "eller klikk for å bla gjennom på din datamaskin",
        dropzoneWarning: "Store mods (>100MB) kan ta betydelig tid/RAM.",
        convertModels: "Konverter Blokmodeller til Geometri (Eksperimentelt)",
        downloadBtnText: "Last ned .mcaddon",
        errorsHeader: "Advarsler & Feil",
        processing: "Behandler...",
        readingDesc: "Leser filarkitektur",
        errorInvalidFile: "Last opp en gyldig .jar fil.",
        errorLargeFileConfirm: "Denne filen er veldig stor (>100MB). Ekstremt store modifikasjoner kan henge eller krasje nettleserfanen. Ønsker du å fortsette?",
        addonReadyTitle: "Addon Klar!",
        addonReadyDesc: "{count} eiendeler konvertert vellykket!",
        conversionFailedTitle: "Konvertering Mislyktes",
        conversionFailedFatal: "En fatal feil oppstod."
    },
    fi: {
        title: "Jar Bedrock Addoniksi",
        subtitle: "Muunna Java Minecraft Modit (.jar) Bedrock Addoneiksi (.mcaddon) välittömästi.",
        dropzoneTitle: "Vedä ja pudota .jar tiedostosi tähän",
        dropzoneSubtitle: "tai klikkaa selataksesi tietokonettasi",
        dropzoneWarning: "Suuret modit (>100MB) voivat viedä huomattavasti aikaa/RAM:ia.",
        convertModels: "Muunna Lohkomallit Geometriaksi (Kokeellinen)",
        downloadBtnText: "Lataa .mcaddon",
        errorsHeader: "Varoitukset & Virheet",
        processing: "Käsittelee...",
        readingDesc: "Lukee tiedostoarkkitehtuuria",
        errorInvalidFile: "Lataa kelvollinen .jar tiedosto.",
        errorLargeFileConfirm: "Tämä tiedosto on erittäin suuri (>100MB). Äärimmäisen suuret muutokset voivat jumittaa tai kaataa selainvälilehden. Haluatko jatkaa?",
        addonReadyTitle: "Addon Valmis!",
        addonReadyDesc: "{count} resurssia muunnettu onnistuneesti!",
        conversionFailedTitle: "Muunnos Epäonnistui",
        conversionFailedFatal: "Kohtalokas virhe tapahtui."
    },
    pl: {
        title: "Jar do Bedrock Addon",
        subtitle: "Konwertuj mody Java Minecraft (.jar) na addony Bedrock (.mcaddon) natychmiast.",
        dropzoneTitle: "Przeciągnij i upuść swój plik .jar tutaj",
        dropzoneSubtitle: "lub kliknij, aby przeglądać na swoim komputerze",
        dropzoneWarning: "Duże mody (>100MB) mogą zająć znaczny czas/RAM.",
        convertModels: "Konwertuj Modele Bloków na Geometrię (Eksperymentalne)",
        downloadBtnText: "Pobierz .mcaddon",
        errorsHeader: "Ostrzeżenia i Błędy",
        processing: "Przetwarzanie...",
        readingDesc: "Czytanie architektury pliku",
        errorInvalidFile: "Prześlij prawidłowy plik .jar.",
        errorLargeFileConfirm: "Ten plik jest bardzo duży (>100MB). Ekstremalnie duże modyfikacje mogą zawiesić lub zablokować kartę przeglądarki. Czy chcesz kontynuować?",
        addonReadyTitle: "Addon Gotowy!",
        addonReadyDesc: "{count} zasobów skonwertowanych pomyślnie!",
        conversionFailedTitle: "Konwersja Nie Powiodła Się",
        conversionFailedFatal: "Wystąpił błąd krytyczny."
    },
    cs: {
        title: "Jar do Bedrock Addon",
        subtitle: "Převeďte mody Java Minecraft (.jar) na addony Bedrock (.mcaddon) okamžitě.",
        dropzoneTitle: "Přetáhněte svůj .jar soubor sem",
        dropzoneSubtitle: "nebo klikněte pro procházení na vašem počítači",
        dropzoneWarning: "Velké mody (>100MB) mohou trvat značnou dobu/RAM.",
        convertModels: "Převést Modely Bloků na Geometrii (Experimentální)",
        downloadBtnText: "Stáhnout .mcaddon",
        errorsHeader: "Varování a Chyby",
        processing: "Zpracovávání...",
        readingDesc: "Čtení architektury souboru",
        errorInvalidFile: "Nahrajte platný .jar soubor.",
        errorLargeFileConfirm: "Tento soubor je velmi velký (>100MB). Extrémně velké modifikace mohou způsobit zablokování nebo pád karty prohlížeče. Chcete pokračovat?",
        addonReadyTitle: "Addon Připraven!",
        addonReadyDesc: "{count} aktiv úspěšně převedeno!",
        conversionFailedTitle: "Převod Selhal",
        conversionFailedFatal: "Došlo k fatální chybě."
    },
    sk: {
        title: "Jar do Bedrock Addon",
        subtitle: "Preveďte mody Java Minecraft (.jar) na addony Bedrock (.mcaddon) okamžite.",
        dropzoneTitle: "Pretiahnite svoj .jar súbor sem",
        dropzoneSubtitle: "alebo kliknite na prehľadanie na vašom počítači",
        dropzoneWarning: "Veľké mody (>100MB) môžu trvať značnú dobu/RAM.",
        convertModels: "Previesť Modely Blokov na Geometriu (Experimentálne)",
        downloadBtnText: "Stiahnuť .mcaddon",
        errorsHeader: "Varovania a Chyby",
        processing: "Spracovanie...",
        readingDesc: "Čítanie architektúry súboru",
        errorInvalidFile: "Nahrajte platný .jar súbor.",
        errorLargeFileConfirm: "Tento súbor je veľmi veľký (>100MB). Extrémne veľké modifikácie môžu spôsobiť zablokovanie alebo pád karty prehliadača. Chcete pokračovať?",
        addonReadyTitle: "Addon Pripravený!",
        addonReadyDesc: "{count} aktív úspešne prevedených!",
        conversionFailedTitle: "Prevod Zlyhal",
        conversionFailedFatal: "Došlo k fatálnej chybe."
    },
    hu: {
        title: "Jar Bedrock Addonba",
        subtitle: "Alakítsa át a Java Minecraft Modokat (.jar) Bedrock Addonokká (.mcaddon) azonnal.",
        dropzoneTitle: "Húzza ide a .jar fájlját",
        dropzoneSubtitle: "vagy kattintson a számítógépén való böngészéshez",
        dropzoneWarning: "A nagy modok (>100MB) jelentős időt/RAM-ot igényelhetnek.",
        convertModels: "Blokkmodellek Geometriává Alakítása (Kísérleti)",
        downloadBtnText: ".mcaddon Letöltése",
        errorsHeader: "Figyelmeztetések és Hibák",
        processing: "Feldolgozás...",
        readingDesc: "Fájlarchitektúra olvasása",
        errorInvalidFile: "Töltsön fel egy érvényes .jar fájlt.",
        errorLargeFileConfirm: "Ez a fájl nagyon nagy (>100MB). A rendkívül nagy módosítások lefagyaszthatják vagy összeomlaszthatják a böngésző lapot. Szeretné folytatni?",
        addonReadyTitle: "Addon Kész!",
        addonReadyDesc: "{count} eszköz sikeresen átalakítva!",
        conversionFailedTitle: "Átalakítás Sikertelen",
        conversionFailedFatal: "Végzetes hiba történt."
    },
    tr: {
        title: "Jar'dan Bedrock Addon'a",
        subtitle: "Java Minecraft Modlarını (.jar) Bedrock Addonlarına (.mcaddon) anında dönüştürün.",
        dropzoneTitle: ".jar dosyanızı buraya sürükleyip bırakın",
        dropzoneSubtitle: "veya bilgisayarınızda göz atmak için tıklayın",
        dropzoneWarning: "Büyük modlar (>100MB) önemli zaman/RAM gerektirebilir.",
        convertModels: "Blok Modellerini Geometriye Dönüştür (Deneysel)",
        downloadBtnText: ".mcaddon İndir",
        errorsHeader: "Uyarılar ve Hatalar",
        processing: "İşleniyor...",
        readingDesc: "Dosya mimarisi okunuyor",
        errorInvalidFile: "Lütfen geçerli bir .jar dosyası yükleyin.",
        errorLargeFileConfirm: "Bu dosya çok büyük (>100MB). Aşırı büyük modifikasyonlar tarayıcı sekmesini dondurabilir veya çökertebilir. Devam etmek istiyor musunuz?",
        addonReadyTitle: "Addon Hazır!",
        addonReadyDesc: "{count} varlık başarıyla dönüştürüldü!",
        conversionFailedTitle: "Dönüştürme Başarısız",
        conversionFailedFatal: "Önemli bir hata oluştu."
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

function getRegionFromLocaleTag(localeTag) {
    if (!localeTag || typeof localeTag !== 'string') return '';

    try {
        if (typeof Intl.Locale === 'function') {
            return new Intl.Locale(localeTag).region || '';
        }
    } catch (error) {
        console.debug('Failed to parse locale tag for region detection:', error);
    }

    const parts = localeTag.split(/[-_]/);
    const regionCandidate = parts.find((part, index) => index > 0 && /^[A-Z]{2}$/.test(part.toUpperCase()));
    return regionCandidate ? regionCandidate.toUpperCase() : '';
}

function detectLanguageFromBrowserHints() {
    const supportedLanguages = new Set(Object.keys(translations));
    const localeHints = Array.from(new Set([
        ...(navigator.languages || []),
        navigator.language,
        navigator.userLanguage
    ].filter(Boolean)));

    for (const localeHint of localeHints) {
        const baseLanguage = localeHint.toLowerCase().split(/[-_]/)[0];
        if (supportedLanguages.has(baseLanguage)) {
            return baseLanguage;
        }
    }

    const regionToLanguage = {
        AT: 'de', BR: 'pt', CN: 'zh', CZ: 'cs', DE: 'de', DK: 'da',
        ES: 'es', FI: 'fi', FR: 'fr', HU: 'hu', IT: 'it', JP: 'ja', KR: 'ko', MX: 'es',
        NL: 'nl', NO: 'no', PL: 'pl', PT: 'pt', RU: 'ru', SE: 'sv', SK: 'sk', TR: 'tr'
    };

    for (const localeHint of localeHints) {
        const region = getRegionFromLocaleTag(localeHint);
        if (regionToLanguage[region]) {
            return regionToLanguage[region];
        }
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const timezoneToLanguage = {
        'Europe/Berlin': 'de',
        'Europe/Vienna': 'de',
        'Europe/Zurich': 'de',
        'Europe/Paris': 'fr',
        'Europe/Madrid': 'es',
        'Europe/Rome': 'it',
        'Europe/Lisbon': 'pt',
        'Europe/Amsterdam': 'nl',
        'Europe/Stockholm': 'sv',
        'Europe/Copenhagen': 'da',
        'Europe/Oslo': 'no',
        'Europe/Helsinki': 'fi',
        'Europe/Warsaw': 'pl',
        'Europe/Prague': 'cs',
        'Europe/Bratislava': 'sk',
        'Europe/Budapest': 'hu',
        'Europe/Istanbul': 'tr',
        'Europe/Moscow': 'ru',
        'Asia/Shanghai': 'zh',
        'Asia/Tokyo': 'ja',
        'Asia/Seoul': 'ko'
    };

    return timezoneToLanguage[timezone] || 'en';
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

    if (langSelect) langSelect.value = currentLang;
}

currentLang = detectLanguageFromBrowserHints();
applyTranslations();
