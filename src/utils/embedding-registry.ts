import { EmbeddingProvider } from '../types';

const providers: EmbeddingProvider[] = [];

export function registerProvider(provider: EmbeddingProvider): void {
    providers.unshift(provider); // Newer providers have higher priority
}

export function getProvider(model: string): EmbeddingProvider {
    const provider = providers.find(p => p.supportsModel(model));
    if (!provider) {
        throw new Error(`No provider supports model: ${model}. Available providers: ${providers.map(p => p.name).join(', ')}`);
    }
    return provider;
}

export function listProviders(): string[] {
    return providers.map(p => p.name);
}