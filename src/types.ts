export interface ChunkOptions {
    type: 'newline' | 'punctuation' | 'characters' | 'regex';
    value?: string | number;
}

export type TaskType = 'text-matching' | 'retrieval.passage' | 'retrieval.query';

export interface ReadResponse {
    data: {
        title: string;
        url: string;
        content: string;
        usage?: {
            tokens: number;
        };
    };
}

export interface JinaEmbeddingRequest {
    model: string;
    task?: TaskType;
    input: string[];
    truncate?: boolean;
    dimensions?: number;
    late_chunking?: boolean;
}

export interface JinaEmbeddingResponse {
    data: Array<{
        index: number;
        embedding: number[];
    }>;
    usage?: {
        total_tokens: number;
    };
}

export interface EmbeddingOptions {
    dimensions?: number;
    late_chunking?: boolean;
    task?: TaskType;
}

export interface EmbeddingResult {
    embeddings: number[][];
    tokens: number;
}

export interface EmbeddingOutput {
    chunk: string;
    embedding: number[];
} 