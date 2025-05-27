export type TaskType = "text-matching" | "retrieval.passage" | "retrieval.query";

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

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface TokenTracker {
    trackUsage: (type: string, usage: TokenUsage) => void;
}

export interface EmbeddingOptions {
    task?: TaskType;
    dimensions?: number;
    late_chunking?: boolean;
}

export interface EmbeddingResult {
    embeddings: number[][];
    tokens: number;
}

export interface ChunkOptions {
    type: 'newline' | 'punctuation' | 'characters' | 'regex';
    value?: string | number;
}

export interface EmbeddingOutput {
    chunk: string;
    embedding: number[];
} 