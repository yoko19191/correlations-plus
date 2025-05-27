import {
    JinaEmbeddingRequest,
    JinaEmbeddingResponse,
    EmbeddingOptions,
    EmbeddingResult
} from '../types';
import axiosClient from './axios-client';

const JINA_API_KEY = process.env.JINA_API_KEY;
const API_URL = "https://api.jina.ai/v1/embeddings";
const MAX_RETRIES = 3;

export async function getEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
    console.log(`[embeddings] Embedding ${texts.length} texts`);

    // disable batching if late chunking is enabled
    const BATCH_SIZE = options.late_chunking ? texts.length : 128;

    if (!JINA_API_KEY) {
        throw new Error('JINA_API_KEY is not set');
    }

    if (texts.length === 0) {
        return { embeddings: [], tokens: 0 };
    }

    const allEmbeddings: number[][] = [];
    let totalTokens = 0;
    const batchCount = Math.ceil(texts.length / BATCH_SIZE);

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batchTexts = texts.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        console.log(`[embeddings] Processing batch ${currentBatch}/${batchCount} (${batchTexts.length} texts)`);

        const { batchEmbeddings, batchTokens } = await getBatchEmbeddingsWithRetry(
            batchTexts,
            options,
            currentBatch,
            batchCount
        );

        allEmbeddings.push(...batchEmbeddings);
        totalTokens += batchTokens;
        console.log(`[embeddings] Batch ${currentBatch} complete. Tokens used: ${batchTokens}, total so far: ${totalTokens}`);
    }

    console.log(`[embeddings] Complete. Generated ${allEmbeddings.length} embeddings using ${totalTokens} tokens`);
    return { embeddings: allEmbeddings, tokens: totalTokens };
}

async function getBatchEmbeddingsWithRetry(
    batchTexts: string[],
    options: EmbeddingOptions,
    currentBatch: number,
    batchCount: number
): Promise<{ batchEmbeddings: number[][], batchTokens: number }> {
    const batchEmbeddings: number[][] = [];
    let batchTokens = 0;
    let retryCount = 0;
    let textsToProcess = [...batchTexts];
    let indexMap = new Map<number, number>();

    textsToProcess.forEach((_, idx) => {
        indexMap.set(idx, idx);
    });

    while (textsToProcess.length > 0 && retryCount < MAX_RETRIES) {
        const request: JinaEmbeddingRequest = {
            model: "jina-embeddings-v3",
            task: options.task || "text-matching",
            input: textsToProcess,
            truncate: true,
            ...options
        };

        try {
            const response = await axiosClient.post<JinaEmbeddingResponse>(
                API_URL,
                request,
                {
                    headers: {
                        "Authorization": `Bearer ${JINA_API_KEY}`
                    }
                }
            );

            if (!response.data.data) {
                console.error('No data returned from Jina API');
                if (retryCount === MAX_RETRIES - 1) {
                    const dimensionSize = options.dimensions || 1024;
                    const placeholderEmbeddings = textsToProcess.map(text => {
                        console.error(`Failed to get embedding after all retries: [${text.substring(0, 50)}...]`);
                        return new Array(dimensionSize).fill(0);
                    });

                    for (let i = 0; i < textsToProcess.length; i++) {
                        const originalIndex = indexMap.get(i)!;
                        while (batchEmbeddings.length <= originalIndex) {
                            batchEmbeddings.push([]);
                        }
                        batchEmbeddings[originalIndex] = placeholderEmbeddings[i];
                    }
                }
                retryCount++;
                continue;
            }

            const receivedIndices = new Set(response.data.data.map(item => item.index));
            const dimensionSize = response.data.data[0]?.embedding?.length || options.dimensions || 1024;

            const remainingTexts: string[] = [];
            const newIndexMap = new Map<number, number>();

            for (let idx = 0; idx < textsToProcess.length; idx++) {
                if (receivedIndices.has(idx)) {
                    const item = response.data.data.find(d => d.index === idx)!;
                    const originalIndex = indexMap.get(idx)!;
                    while (batchEmbeddings.length <= originalIndex) {
                        batchEmbeddings.push([]);
                    }
                    batchEmbeddings[originalIndex] = item.embedding;
                } else {
                    const newIndex = remainingTexts.length;
                    newIndexMap.set(newIndex, indexMap.get(idx)!);
                    remainingTexts.push(textsToProcess[idx]);
                    console.log(`Missing embedding for index ${idx}, will retry: [${textsToProcess[idx].substring(0, 50)}...]`);
                }
            }

            batchTokens += response.data.usage?.total_tokens || 0;
            textsToProcess = remainingTexts;
            indexMap = newIndexMap;

            if (textsToProcess.length === 0) {
                break;
            }

            retryCount++;
            console.log(`[embeddings] Batch ${currentBatch}/${batchCount} - Retrying ${textsToProcess.length} texts (attempt ${retryCount}/${MAX_RETRIES})`);
        } catch (error: any) {
            console.error('Error calling Jina Embeddings API:', error);
            if (error.response?.status === 402 || error.message.includes('InsufficientBalanceError') || error.message.includes('insufficient balance')) {
                return { batchEmbeddings: [], batchTokens: 0 };
            }

            if (retryCount === MAX_RETRIES - 1) {
                const dimensionSize = options.dimensions || 1024;
                for (let idx = 0; idx < textsToProcess.length; idx++) {
                    const originalIndex = indexMap.get(idx)!;
                    console.error(`Failed to get embedding after all retries for index ${originalIndex}: [${textsToProcess[idx].substring(0, 50)}...]`);

                    while (batchEmbeddings.length <= originalIndex) {
                        batchEmbeddings.push([]);
                    }
                    batchEmbeddings[originalIndex] = new Array(dimensionSize).fill(0);
                }
            }

            retryCount++;
            if (retryCount < MAX_RETRIES) {
                console.log(`[embeddings] Batch ${currentBatch}/${batchCount} - Retry attempt ${retryCount}/${MAX_RETRIES} after error`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw error;
            }
        }
    }

    if (textsToProcess.length > 0) {
        console.error(`[embeddings] Failed to get embeddings for ${textsToProcess.length} texts after ${MAX_RETRIES} retries`);
        const dimensionSize = options.dimensions || 1024;

        for (let idx = 0; idx < textsToProcess.length; idx++) {
            const originalIndex = indexMap.get(idx)!;
            console.error(`Creating zero embedding for index ${originalIndex} after all retries failed`);

            while (batchEmbeddings.length <= originalIndex) {
                batchEmbeddings.push([]);
            }
            batchEmbeddings[originalIndex] = new Array(dimensionSize).fill(0);
        }
    }

    return { batchEmbeddings, batchTokens };
} 