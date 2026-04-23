(function (globalScope) {
    const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
    const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
    const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
    const UTF8_FLAG = 0x0800;
    const STORE_METHOD = 0;
    const DEFLATE_METHOD = 8;
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const crcTable = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let crc = i;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
            }
            table[i] = crc >>> 0;
        }
        return table;
    })();

    function normalizePath(path) {
        return String(path || '').replace(/^\/+/, '').replace(/\\/g, '/');
    }

    function getBufferSlice(buffer, offset, length) {
        return buffer.slice(offset, offset + length);
    }

    function decodeName(bytes) {
        return textDecoder.decode(bytes);
    }

    function toUint8Array(data) {
        if (data instanceof Uint8Array) return data;
        if (ArrayBuffer.isView(data)) {
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        }
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        return new Uint8Array(0);
    }

    async function toArrayBuffer(data) {
        if (data instanceof ArrayBuffer) return data;
        if (ArrayBuffer.isView(data)) {
            return getBufferSlice(data.buffer, data.byteOffset, data.byteLength);
        }
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            return await data.arrayBuffer();
        }
        if (typeof data === 'string') {
            return textEncoder.encode(data).buffer;
        }
        if (data == null) {
            return new ArrayBuffer(0);
        }
        return textEncoder.encode(String(data)).buffer;
    }

    async function inflateRaw(buffer) {
        if (typeof DecompressionStream !== 'function') {
            throw new Error('This browser does not support ZIP decompression in workers.');
        }

        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return await new Response(stream).arrayBuffer();
    }

    function crc32(buffer) {
        const bytes = toUint8Array(buffer);
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function concatArrays(chunks) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }

    function createDosTimestamp(date = new Date()) {
        const safeYear = Math.max(1980, date.getFullYear());
        const dosTime = ((date.getHours() & 0x1F) << 11) |
            ((date.getMinutes() & 0x3F) << 5) |
            ((Math.floor(date.getSeconds() / 2)) & 0x1F);
        const dosDate = (((safeYear - 1980) & 0x7F) << 9) |
            (((date.getMonth() + 1) & 0x0F) << 5) |
            (date.getDate() & 0x1F);
        return { dosDate, dosTime };
    }

    class SimpleZipEntry {
        constructor(name, options = {}) {
            this.name = name;
            this.dir = !!options.dir;
            this._sourceBuffer = options.sourceBuffer || null;
            this._compressionMethod = options.compressionMethod || STORE_METHOD;
            this._compressedSize = options.compressedSize || 0;
            this._uncompressedSize = options.uncompressedSize || 0;
            this._dataOffset = options.dataOffset || 0;
            this._outputData = options.outputData;
            this._cachedBuffer = null;
        }

        async getBuffer() {
            if (this._cachedBuffer) return this._cachedBuffer;

            if (this._outputData !== undefined) {
                this._cachedBuffer = await toArrayBuffer(this._outputData);
                return this._cachedBuffer;
            }

            if (!this._sourceBuffer) {
                this._cachedBuffer = new ArrayBuffer(0);
                return this._cachedBuffer;
            }

            const compressedBuffer = getBufferSlice(this._sourceBuffer, this._dataOffset, this._compressedSize);
            if (this._compressionMethod === STORE_METHOD) {
                this._cachedBuffer = compressedBuffer;
                return this._cachedBuffer;
            }
            if (this._compressionMethod === DEFLATE_METHOD) {
                this._cachedBuffer = await inflateRaw(compressedBuffer);
                return this._cachedBuffer;
            }

            throw new Error(`Unsupported ZIP compression method: ${this._compressionMethod}`);
        }

        async async(type) {
            const buffer = await this.getBuffer();
            switch (type) {
                case 'string':
                    return textDecoder.decode(buffer);
                case 'arraybuffer':
                    return buffer;
                case 'uint8array':
                    return new Uint8Array(buffer);
                case 'blob':
                    return new Blob([buffer]);
                default:
                    throw new Error(`Unsupported ZIP read type: ${type}`);
            }
        }
    }

    class SimpleZipFolder {
        constructor(zip, prefix) {
            this.zip = zip;
            this.prefix = prefix;
        }

        file(name, data) {
            if (arguments.length === 1) {
                return this.zip.file(this.prefix + normalizePath(name));
            }
            this.zip.file(this.prefix + normalizePath(name), data);
            return this;
        }

        folder(name) {
            const prefix = `${this.prefix}${normalizePath(name).replace(/\/?$/, '/')}`;
            return new SimpleZipFolder(this.zip, prefix);
        }
    }

    class JSZip {
        constructor() {
            this.files = {};
        }

        async loadAsync(source) {
            const buffer = await toArrayBuffer(source);
            const view = new DataView(buffer);
            const minOffset = Math.max(0, buffer.byteLength - 0xFFFF - 22);
            let eocdOffset = -1;

            for (let offset = buffer.byteLength - 22; offset >= minOffset; offset--) {
                if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
                    eocdOffset = offset;
                    break;
                }
            }

            if (eocdOffset === -1) {
                throw new Error('Invalid ZIP file: end of central directory not found.');
            }

            const entryCount = view.getUint16(eocdOffset + 10, true);
            const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
            let cursor = centralDirectoryOffset;
            this.files = {};

            for (let i = 0; i < entryCount; i++) {
                if (view.getUint32(cursor, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
                    throw new Error('Invalid ZIP file: central directory entry missing.');
                }

                const compressionMethod = view.getUint16(cursor + 10, true);
                const compressedSize = view.getUint32(cursor + 20, true);
                const uncompressedSize = view.getUint32(cursor + 24, true);
                const fileNameLength = view.getUint16(cursor + 28, true);
                const extraFieldLength = view.getUint16(cursor + 30, true);
                const fileCommentLength = view.getUint16(cursor + 32, true);
                const localHeaderOffset = view.getUint32(cursor + 42, true);
                const nameBytes = new Uint8Array(buffer, cursor + 46, fileNameLength);
                const fileName = decodeName(nameBytes);
                const localView = new DataView(buffer, localHeaderOffset);

                if (localView.getUint32(0, true) !== LOCAL_FILE_HEADER_SIGNATURE) {
                    throw new Error(`Invalid ZIP file: local header missing for ${fileName}.`);
                }

                const localNameLength = localView.getUint16(26, true);
                const localExtraLength = localView.getUint16(28, true);
                const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
                const isDirectory = fileName.endsWith('/');

                this.files[fileName] = new SimpleZipEntry(fileName, {
                    dir: isDirectory,
                    sourceBuffer: buffer,
                    compressionMethod,
                    compressedSize,
                    uncompressedSize,
                    dataOffset
                });

                cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
            }

            return this;
        }

        file(name, data) {
            const normalizedName = normalizePath(name);
            if (arguments.length === 1) {
                return this.files[normalizedName];
            }

            this.files[normalizedName] = new SimpleZipEntry(normalizedName, {
                dir: normalizedName.endsWith('/'),
                outputData: data
            });
            return this;
        }

        folder(name) {
            const prefix = `${normalizePath(name).replace(/\/?$/, '/')}`;
            return new SimpleZipFolder(this, prefix);
        }

        async generateAsync(options = {}, updateCallback) {
            const type = options.type || 'blob';
            const fileEntries = Object.values(this.files).filter(entry => !entry.dir);
            const localChunks = [];
            const centralChunks = [];
            let localOffset = 0;

            for (let index = 0; index < fileEntries.length; index++) {
                const entry = fileEntries[index];
                const nameBytes = textEncoder.encode(entry.name);
                const fileBuffer = await entry.getBuffer();
                const fileBytes = new Uint8Array(fileBuffer);
                const checksum = crc32(fileBuffer);
                const { dosDate, dosTime } = createDosTimestamp();

                const localHeader = new Uint8Array(30);
                const localView = new DataView(localHeader.buffer);
                localView.setUint32(0, LOCAL_FILE_HEADER_SIGNATURE, true);
                localView.setUint16(4, 20, true);
                localView.setUint16(6, UTF8_FLAG, true);
                localView.setUint16(8, STORE_METHOD, true);
                localView.setUint16(10, dosTime, true);
                localView.setUint16(12, dosDate, true);
                localView.setUint32(14, checksum, true);
                localView.setUint32(18, fileBytes.length, true);
                localView.setUint32(22, fileBytes.length, true);
                localView.setUint16(26, nameBytes.length, true);
                localView.setUint16(28, 0, true);

                localChunks.push(localHeader, nameBytes, fileBytes);

                const centralHeader = new Uint8Array(46);
                const centralView = new DataView(centralHeader.buffer);
                centralView.setUint32(0, CENTRAL_DIRECTORY_SIGNATURE, true);
                centralView.setUint16(4, 20, true);
                centralView.setUint16(6, 20, true);
                centralView.setUint16(8, UTF8_FLAG, true);
                centralView.setUint16(10, STORE_METHOD, true);
                centralView.setUint16(12, dosTime, true);
                centralView.setUint16(14, dosDate, true);
                centralView.setUint32(16, checksum, true);
                centralView.setUint32(20, fileBytes.length, true);
                centralView.setUint32(24, fileBytes.length, true);
                centralView.setUint16(28, nameBytes.length, true);
                centralView.setUint16(30, 0, true);
                centralView.setUint16(32, 0, true);
                centralView.setUint16(34, 0, true);
                centralView.setUint16(36, 0, true);
                centralView.setUint32(38, 0, true);
                centralView.setUint32(42, localOffset, true);
                centralChunks.push(centralHeader, nameBytes);

                localOffset += localHeader.length + nameBytes.length + fileBytes.length;

                if (typeof updateCallback === 'function') {
                    updateCallback({ percent: ((index + 1) / fileEntries.length) * 100 });
                }
            }

            const centralDirectory = concatArrays(centralChunks);
            const localFiles = concatArrays(localChunks);
            const endRecord = new Uint8Array(22);
            const endView = new DataView(endRecord.buffer);
            endView.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
            endView.setUint16(4, 0, true);
            endView.setUint16(6, 0, true);
            endView.setUint16(8, fileEntries.length, true);
            endView.setUint16(10, fileEntries.length, true);
            endView.setUint32(12, centralDirectory.length, true);
            endView.setUint32(16, localFiles.length, true);
            endView.setUint16(20, 0, true);

            const finalBytes = concatArrays([localFiles, centralDirectory, endRecord]);

            if (type === 'blob') {
                return new Blob([finalBytes], { type: 'application/zip' });
            }
            if (type === 'uint8array') {
                return finalBytes;
            }
            if (type === 'arraybuffer') {
                return finalBytes.buffer.slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength);
            }
            throw new Error(`Unsupported ZIP output type: ${type}`);
        }
    }

    globalScope.JSZip = JSZip;
})(typeof self !== 'undefined' ? self : globalThis);
