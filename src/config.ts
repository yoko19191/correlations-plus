import { config } from 'dotenv';

// Load environment variables from .env file
config();

export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    [key: string]: any;
}

export const PROVIDER_CONFIG = {
    jina: {
        apiKey: process.env.JINA_API_KEY || '',
        baseUrl: 'https://api.jina.ai/v1'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    }
} as const;

// Backward compatibility exports
export const JINA_API_KEY = PROVIDER_CONFIG.jina.apiKey;
export const OPENAI_API_KEY = PROVIDER_CONFIG.openai.apiKey;
export const OPENAI_BASE_URL = PROVIDER_CONFIG.openai.baseUrl; 