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

    processFile(file);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const generateManifest = (type, name, description) => {
    const headerUUID = generateUUID();
    const moduleUUID = generateUUID();
    
    return JSON.stringify({
        "format_version": 2,
        "header": {
            "name": name,
            "description": description,
            "uuid": headerUUID,
            "version": [1, 0, 0],
            "min_engine_version": [1, 16, 0]
        },
        "modules": [
            {
                "type": type === 'resources' ? 'resources' : 'data',
                "uuid": moduleUUID,
                "version": [1, 0, 0]
            }
        ]
    }, null, 4);
};

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

async function processFile(file) {
    const modNameBase = file.name.replace('.jar', '').replace('.zip', '');
    updateStatus('Processing...', `Reading ${file.name}`);
    downloadBtn.classList.add('hidden');

    try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        
        const addonZip = new JSZip();
        
        // Create Behaviors and Resources folders
        const bpFolder = addonZip.folder(`${modNameBase}_BP`);
        const rpFolder = addonZip.folder(`${modNameBase}_RP`);
        
        // Add Manifests
        updateStatus('Generating Assets...', 'Creating Bedrock manifests');
        bpFolder.file("manifest.json", generateManifest('data', `${modNameBase} Behaviors`, "Converted from Java Edition"));
        rpFolder.file("manifest.json", generateManifest('resources', `${modNameBase} Resources`, "Converted from Java Edition"));
        
        // Basic mapping logic - copy textures
        updateStatus('Extracting Assets...', 'Locating Java textures');
        
        let fileCount = 0;
        
        // Find texture files
        for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
            if (zipEntry.dir) continue;
            
            // Check if it's a texture in assets/<namespace>/textures/...
            const textureMatch = relativePath.match(/^assets\/[^/]+\/textures\/(.*)$/);
            if (textureMatch) {
                const bedrockTexturePath = textureMatch[1];
                const content = await zipEntry.async('arraybuffer');
                // Place into ResourcePack/textures/
                rpFolder.file(`textures/${bedrockTexturePath}`, content);
                fileCount++;
                
                // Keep UI updated occasionally
                if (fileCount % 10 === 0) {
                    updateStatus('Copying Textures...', `Migrated ${fileCount} files`);
                }
            }
        }
        
        updateStatus('Packaging Addon...', 'Compressing file to .mcaddon format');
        
        // Generate the final mcaddon
        const content = await addonZip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 5
            }
        });
        
        // Show success
        updateStatus('Addon Ready!', `Converted ${fileCount} textures successfully.`, false);
        
        // Setup download link
        const url = URL.createObjectURL(content);
        downloadBtn.href = url;
        downloadBtn.download = `${modNameBase}.mcaddon`;
        downloadBtn.classList.remove('hidden');
        
    } catch (error) {
        console.error(error);
        updateStatus('Conversion Failed', error.message || 'An error occurred during conversion.', false);
        spinner.classList.add('hidden');
    }
}
