const OpenAI = require("openai");
require('dotenv').config({ path: __dirname + '/../../.env' });
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
import { BotMessage } from '../conversation';
import { Model } from './model';

const model = "gpt-4o";

/**
 * Generate a response to a given prompt using the specified system message.
 * Takes an entire message history.
 */
export async function generate(messages: BotMessage[], systemMessage: string, temperature: number = 0, maxTokens: number = 4096): Promise<string> {
    try {
        var request = {
            model: model,
            max_tokens: maxTokens,
            messages: [
                {
                    role: "system",
                    content: systemMessage,
                },
                ...messages.map((message) => ({
                    role: message.role,
                    content:[
                        { type: "text", text: message.content },
                        ...(message.imageUrls ? message.imageUrls.map((url) => ({type: "image_url", image_url: {"url": url}})) : [])
                    ],
                })),
            ],
            temperature: temperature
        }
        
        const completion = await openai.chat.completions.create(request);
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error while generating text:', error);
    }
}

export class OpenAiGpt implements Model {
    async generate(messages: BotMessage[], systemMessage: string, temperature: number, maxTokens: number): Promise<string> {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
