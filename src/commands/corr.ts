import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import express from 'express';
import { Matrix } from 'ml-matrix';
import ndjson from 'ndjson';
import { EmbeddingOutput } from '../types';

interface CorrelationData {
    matrix: number[][];
    rowLabels: string[];
    colLabels: string[];
    rowFull: string[];
    colFull: string[];
    rowFile: string;
    colFile: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
}

function computeCorrelationMatrix(embeddings1: number[][], embeddings2: number[][]): number[][] {
    const matrix = new Matrix(embeddings1.length, embeddings2.length);

    for (let i = 0; i < embeddings1.length; i++) {
        for (let j = 0; j < embeddings2.length; j++) {
            matrix.set(i, j, cosineSimilarity(embeddings1[i], embeddings2[j]));
        }
    }

    return matrix.to2DArray();
}

async function loadEmbeddings(filePath: string): Promise<{ embeddings: number[][], chunks: string[] }> {
    return new Promise((resolve, reject) => {
        const embeddings: number[][] = [];
        const chunks: string[] = [];

        fs.createReadStream(filePath)
            .pipe(ndjson.parse())
            .on('data', (obj: EmbeddingOutput) => {
                embeddings.push(obj.embedding);
                chunks.push(obj.chunk);
            })
            .on('end', () => resolve({ embeddings, chunks }))
            .on('error', reject);
    });
}

function truncateLabel(text: string, maxLen = 32): string {
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function generateHTML(data: CorrelationData): string {
    const templatePath = path.join(__dirname, `../templates/correlation_d3.html`);
    const template = fs.readFileSync(templatePath, 'utf-8');
    return template.replace('{{ DATA }}', JSON.stringify(data));
}

async function main() {
    const program = new Command();

    program
        .name('corr')
        .description('Compute and visualize correlations between embeddings')
        .argument('<file1>', 'First JSONL file with embeddings')
        .argument('[file2]', 'Second JSONL file with embeddings (optional)')
        .option('-p, --port <number>', 'Port for the visualization server', '3000')
        .parse(process.argv);

    const options = program.opts();
    const [file1, file2] = program.args;

    try {
        console.log('Loading embeddings...');
        const { embeddings: embeddings1, chunks: chunks1 } = await loadEmbeddings(file1);

        let embeddings2: number[][];
        let chunks2: string[];

        if (file2) {
            const result = await loadEmbeddings(file2);
            embeddings2 = result.embeddings;
            chunks2 = result.chunks;
        } else {
            embeddings2 = embeddings1;
            chunks2 = chunks1;
        }

        console.log('Computing correlation matrix...');
        const matrix = computeCorrelationMatrix(embeddings1, embeddings2);

        // Truncate labels for axis, keep full for hover
        const rowLabels = chunks1.map(c => truncateLabel(c));
        const colLabels = chunks2.map(c => truncateLabel(c));
        const data: CorrelationData = {
            matrix,
            rowLabels,
            colLabels,
            rowFull: chunks1,
            colFull: chunks2,
            rowFile: path.basename(file1),
            colFile: file2 ? path.basename(file2) : path.basename(file1)
        };

        const app = express();
        const port = parseInt(options.port);

        app.get('/', (req, res) => {
            res.send(generateHTML(data));
        });

        app.listen(port, () => {
            console.log(`Visualization server running at http://localhost:${port}`);
            console.log('Press Ctrl+C to stop the server');
        });
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
} 