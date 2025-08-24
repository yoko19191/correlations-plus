import axios, { AxiosError } from 'axios';
import {
    EmbeddingOptions,
    EmbeddingResult,
    EmbeddingProvider
} from '../../types';
import { PROVIDER_CONFIG } from '../../config';
import { registerProvider } from '../embedding-registry';

interface OpenAIEmbeddingRequest {
    input: string[];
    model: string;
    encoding_format?: string;
    dimensions?: number;
}

interface OpenAIEmbeddingResponse {
    data: Array<{
        index: number;
        embedding: number[];
    }>;
    usage: {
        total_tokens: number;
    };
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    name = 'openai';
    
    supportsModel(model: string): boolean {
        return model.startsWith('text-embedding-') || model.startsWith('openai:');
    }
    async getEmbeddings(
        texts: string[] | Record<string, string>[],
        options: EmbeddingOptions = {}
    ): Promise<EmbeddingResult> {
        const model = options.model || 'text-embedding-3-small';
        // Handle openai: prefix
        const actualModel = model.startsWith('openai:') ? model.slice(7) : model;
        console.log(`[openai-embeddings] Embedding ${texts.length} texts using model: ${actualModel}`);

        if (!PROVIDER_CONFIG.openai.apiKey) {
            throw new Error('OPENAI_API_KEY is not set in environment variables');
        }

        if (texts.length === 0) {
            return { embeddings: [], tokens: 0 };
        }

        // Convert Record<string, string>[] to string[] if needed
        const stringTexts: string[] = texts.map(text => 
            typeof text === 'string' ? text : Object.values(text)[0]
        );

        // OpenAI has different batch limits, typically 2048 texts
        const BATCH_SIZE = 1000;
        const allEmbeddings: number[][] = [];
        let totalTokens = 0;
        const batchCount = Math.ceil(stringTexts.length / BATCH_SIZE);

        for (let i = 0; i < stringTexts.length; i += BATCH_SIZE) {
            const batchTexts = stringTexts.slice(i, i + BATCH_SIZE);
            const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
            console.log(`[openai-embeddings] Processing batch ${currentBatch}/${batchCount} (${batchTexts.length} texts)`);

            const request: OpenAIEmbeddingRequest = {
                input: batchTexts,
                model: actualModel,
                encoding_format: 'float'
            };

            // Add dimensions if specified
            if (options.dimensions) {
                request.dimensions = options.dimensions;
            }

            try {
                const response = await axios.post<OpenAIEmbeddingResponse>(
                    `${PROVIDER_CONFIG.openai.baseUrl}/embeddings`,
                    request,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${PROVIDER_CONFIG.openai.apiKey}`
                        }
                    }
                );

                if (!response.data.data) {
                    throw new Error('No data returned from OpenAI API');
                }

                // Extract embeddings in correct order
                const batchEmbeddings: number[][] = new Array(batchTexts.length);
                for (const item of response.data.data) {
                    batchEmbeddings[item.index] = item.embedding;
                }

                allEmbeddings.push(...batchEmbeddings);
                totalTokens += response.data.usage.total_tokens;
                console.log(`[openai-embeddings] Batch ${currentBatch} complete. Tokens used: ${response.data.usage.total_tokens}, total so far: ${totalTokens}`);

            } catch (error) {
                console.error('Error calling OpenAI Embeddings API:', error);
                
                if (error instanceof AxiosError) {
                    if (error.response?.status === 401) {
                        throw new Error('Invalid OpenAI API key');
                    } else if (error.response?.status === 429) {
                        throw new Error('OpenAI rate limit exceeded');
                    }
                }
                throw error;
            }
        }

        console.log(`[openai-embeddings] Complete. Generated ${allEmbeddings.length} embeddings using ${totalTokens} tokens`);
        return { embeddings: allEmbeddings, tokens: totalTokens };
    }
}

// Auto-register the provider
registerProvider(new OpenAIEmbeddingProvider());