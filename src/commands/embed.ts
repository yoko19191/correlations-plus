import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { getEmbeddings } from '../utils/embeddings';
import { ChunkOptions, EmbeddingOutput } from '../types';

function chunkText(text: string, options: ChunkOptions): string[] {
    switch (options.type) {
        case 'newline':
            return text.split('\n').filter(chunk => chunk.trim().length > 0);

        case 'punctuation':
            // Split by common Chinese and English punctuation
            return text.split(/[.!?。！？]/).filter(chunk => chunk.trim().length > 0);

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
        .description('Embed text chunks from a file')
        .argument('<file>', 'Input text file path')
        .option('-c, --chunk <type>', 'Chunking type (newline, punctuation, characters, regex)', 'newline')
        .option('-v, --value <value>', 'Value for chunking (number for characters, regex pattern for regex)')
        .option('-d, --dimensions <number>', 'Embedding dimensions', '1024')
        .option('-l, --late-chunking', 'Enable late chunking')
        .option('-t, --embedding-type <type>', 'Embedding type')
        .option('-o, --output <path>', 'Output JSON file path')
        .parse(process.argv);

    const options = program.opts();
    const inputFile = program.args[0];
    const outputPath = options.output || `${inputFile}.jsonl`;

    try {
        // Read input file
        const text = fs.readFileSync(inputFile, 'utf-8');

        // Parse chunking options
        const chunkOptions: ChunkOptions = {
            type: options.chunk as ChunkOptions['type'],
            value: options.value
        };

        // Chunk the text
        const chunks = chunkText(text, chunkOptions);
        console.log(`Chunked text into ${chunks.length} pieces`);

        // Get embeddings
        const { embeddings } = await getEmbeddings(chunks, undefined, {
            dimensions: Number(options.dimensions),
            late_chunking: options.lateChunking,
            embedding_type: options.embeddingType
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

if (require.main === module) {
    main().catch(console.error);
} 