import fs from 'fs';
import { Command } from 'commander';
import { getEmbeddings } from '../utils/embeddings';
import { ChunkOptions, TaskType } from '../types';
import { readUrl } from '../utils/reader';

function chunkText(text: string, options: ChunkOptions): string[] {
    switch (options.type) {
        case 'newline':
            return text.split('\n').filter(chunk => chunk.trim().length > 0);

        case 'punctuation':
            // Split by common Chinese and English punctuation while preserving them
            return text.split(/(?<=[.!?。！？])/).filter(chunk => chunk.trim().length > 0);

        case 'characters':
            const chunkSize = Number(options.value) || 1000;
            const chunks: string[] = [];
            for (let i = 0; i < text.length; i += chunkSize) {
                chunks.push(text.slice(i, i + chunkSize));
            }
            return chunks;

        case 'regex':
            if (!options.value || typeof options.value !== 'string') {
                throw new Error('Regex pattern is required for regex chunking');
            }
            return text.split(new RegExp(options.value)).filter(chunk => chunk.trim().length > 0);

        default:
            throw new Error('Invalid chunking type');
    }
}

async function main() {
    const program = new Command();

    program
        .name('embed')
        .description('Embed text from a file or URL')
        .argument('<input>', 'Input text file path or URL')
        .option('-c, --chunk <type>', 'Chunking type (newline, punctuation, characters, regex)', 'newline')
        .option('-v, --value <value>', 'Value for chunking (number for characters, regex pattern for regex)')
        .option('-d, --dimensions <number>', 'Embedding dimensions', '1024')
        .option('-l, --late-chunking', 'Enable late chunking')
        .option('-t, --task-type <type>', 'Task type (text-matching, retrieval.passage, retrieval.query)')
        .option('-m, --model <string>', 'Embedding model to use', 'jina-embeddings-v3')
        .option('-o, --output <path>', 'Output JSON file path')
        .parse(process.argv);

    const options = program.opts();
    const input = program.args[0];

    try {
        let text: string;
        let outputPath: string;

        // Check if input is a URL
        if (input.startsWith('http://') || input.startsWith('https://')) {
            if (isImage(input)) {
                text = input; // Send URL directly for web images
            } else {
                const { response } = await readUrl(input);
                text = response.data.content;
            }
            const domain = new URL(input).hostname.replace(/\./g, '-');
            outputPath = options.output || `${domain}.jsonl`;
        } else {
            // Check if it's a local image file
            if (isImage(input)) {
                const imageBuffer = fs.readFileSync(input);
                text = imageBuffer.toString('base64'); // Send base64 without data URI prefix
            } else {
                text = fs.readFileSync(input, 'utf-8');
            }
            outputPath = options.output || `${input.replace(/[^a-zA-Z0-9]/g, '_')}.jsonl`;
        }

        // Parse chunking options
        const chunkOptions: ChunkOptions = {
            type: options.chunk as ChunkOptions['type'],
            value: options.value
        };

        console.log(options);

        // Chunk the text
        const chunks = chunkText(text, chunkOptions);
        console.log(`Chunked text into ${chunks.length} pieces`);

        // Get embeddings
        const { embeddings } = await getEmbeddings(chunks, {
            dimensions: Number(options.dimensions),
            late_chunking: options.lateChunking,
            task: options.taskType,
            model: options.model
        });

        // Write JSON Lines output
        const outputStream = fs.createWriteStream(outputPath, { flags: 'w' });
        for (let i = 0; i < chunks.length; i++) {
            const obj = { chunk: chunks[i], embedding: embeddings[i] };
            outputStream.write(JSON.stringify(obj) + '\n');
        }
        outputStream.end();
        console.log(`Embeddings written to ${outputPath} (JSON Lines format)`);
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

function isImage(path: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
}

if (require.main === module) {
    main().catch(console.error);
} 