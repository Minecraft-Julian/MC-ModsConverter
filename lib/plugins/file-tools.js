/**
 * Plugin: File Tools
 * Low-level file operations: read, write, move, list files in the Java/Bedrock zips.
 * This is the fallback when specialized tools don't work.
 */
export default function register(ps) {
    // Read a file from the Java mod
    ps.register('read_file',
        'Read the contents of a file from the uploaded Java mod. Returns text for text files or base64 for binary.',
        {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path inside the Java mod ZIP' },
                encoding: { type: 'string', enum: ['text', 'base64'], description: 'How to return content' }
            },
            required: ['path']
        },
        async (args, ctx) => {
            const entry = ctx.javaZip.file(args.path);
            if (!entry) return { success: false, message: `File not found: ${args.path}` };

            const encoding = args.encoding || 'text';
            if (encoding === 'base64') {
                const data = await entry.async('base64');
                return { success: true, content: data, encoding: 'base64' };
            }
            const content = await entry.async('string');
            // Truncate very long files to avoid overwhelming the LLM context
            const truncated = content.length > 8000;
            return {
                success: true,
                content: truncated ? content.substring(0, 8000) + '\n... [truncated]' : content,
                truncated,
                size: content.length
            };
        }
    );

    // Write a file to the Bedrock addon
    ps.register('write_file',
        'Write a file directly to the Bedrock addon output. Use this when specialized tools cannot handle a specific conversion. Specify the pack (rp or bp) and the file path.',
        {
            type: 'object',
            properties: {
                pack: { type: 'string', enum: ['rp', 'bp'], description: 'Which pack to write to' },
                path: { type: 'string', description: 'File path within the pack' },
                content: { type: 'string', description: 'File content (text)' }
            },
            required: ['pack', 'path', 'content']
        },
        async (args, ctx) => {
            const folder = args.pack === 'rp' ? ctx.rpFolder : ctx.bpFolder;
            folder.file(args.path, args.content);
            return { success: true, message: `Wrote ${args.pack.toUpperCase()}/${args.path}` };
        }
    );

    // Copy a binary file from Java to Bedrock
    ps.register('copy_file',
        'Copy a file from the Java mod directly to the Bedrock addon. Useful for binary files like images or sounds.',
        {
            type: 'object',
            properties: {
                sourcePath: { type: 'string', description: 'Path in Java mod' },
                destPack: { type: 'string', enum: ['rp', 'bp'] },
                destPath: { type: 'string', description: 'Destination path in the Bedrock pack' }
            },
            required: ['sourcePath', 'destPack', 'destPath']
        },
        async (args, ctx) => {
            const entry = ctx.javaZip.file(args.sourcePath);
            if (!entry) return { success: false, message: `Source not found: ${args.sourcePath}` };

            const data = await entry.async('uint8array');
            const folder = args.destPack === 'rp' ? ctx.rpFolder : ctx.bpFolder;
            folder.file(args.destPath, data);
            return { success: true, message: `Copied ${args.sourcePath} → ${args.destPack.toUpperCase()}/${args.destPath}` };
        }
    );

    // List files in the Java mod
    ps.register('list_files',
        'List files in the Java mod ZIP, optionally filtered by path prefix. Returns file paths and sizes.',
        {
            type: 'object',
            properties: {
                prefix: { type: 'string', description: 'Path prefix to filter (e.g. "assets/mymod/textures/")' },
                maxResults: { type: 'number', description: 'Maximum results to return (default 100)' }
            }
        },
        async (args, ctx) => {
            const prefix = args.prefix || '';
            const max = args.maxResults || 100;
            const files = [];

            for (const [path, entry] of Object.entries(ctx.javaZip.files)) {
                if (entry.dir) continue;
                if (prefix && !path.startsWith(prefix)) continue;
                files.push({ path, size: entry._data?.uncompressedSize || 0 });
                if (files.length >= max) break;
            }

            return {
                success: true,
                count: files.length,
                files,
                message: `Found ${files.length} files${prefix ? ` under "${prefix}"` : ''}`
            };
        }
    );
}
