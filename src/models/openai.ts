const OpenAI = require("openai");
require('dotenv').config({ path: __dirname + '/../../.env' });
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
import { Model } from './model';

const model = "gpt-4o";

/**
 * Generate a response to a given prompt using the specified system message.
 * Takes an entire message history.
 */
export async function generate(messages: any[], systemMessage: string, temperature: number = 0, maxTokens: number = 4096): Promise<string> {
    try {
        const completion = await openai.chat.completions.create({
            model: model,
            max_tokens: maxTokens,
            messages: [
                {
                    role: "system",
                    content: systemMessage,
                },
                ...messages,
            ],
            temperature: temperature
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error while generating text:', error);
    }
}

export class OpenAiGpt implements Model {
    async generate(messages: any[], systemMessage: string, temperature: number, maxTokens: number): Promise<string> {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
