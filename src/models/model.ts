import { BotMessage } from '../conversation';

export interface Model {
    generate(messages: BotMessage[], systemMessage: string, temperature: number, maxTokens: number): Promise<string>;
}