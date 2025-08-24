import { EmbeddingProvider, EmbeddingOptions, EmbeddingResult } from '../types';
import { getProvider } from './embedding-registry';

// Auto-register default providers
import './providers/jina-provider';
import './providers/openai-provider';

export function createEmbeddingProvider(model: string): EmbeddingProvider {
    return getProvider(model);
}

// Export the old function for backward compatibility
export async function getEmbeddings(
    texts: string[] | Record<string, string>[],
    options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
    const provider = getProvider(options.model || 'jina-embeddings-v3');
    return provider.getEmbeddings(texts, options);
}