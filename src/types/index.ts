export interface JinaEmbeddingRequest {
    model: string;
    task?: "text-matching" | "retrieval.passage" | "retrieval.query";
    input: string[];
    truncate?: boolean;
    dimensions?: number;
    late_chunking?: boolean;
    embedding_type?: string;
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
    task?: "text-matching" | "retrieval.passage" | "retrieval.query";
    dimensions?: number;
    late_chunking?: boolean;
    embedding_type?: string;
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