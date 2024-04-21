export interface Model {
    generate(messages: any[], systemMessage: string, temperature: number, maxTokens: number): Promise<string>;
}