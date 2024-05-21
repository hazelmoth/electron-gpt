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
export async function generate(
    messages: BotMessage[], 
    systemMessage: string, 
    temperature: number = 0, 
    maxTokens: number = 4096
): Promise<string> {
    try {
        // Sequentially fetch images as base64 strings
        const processedMessages = await Promise.all(messages.map(async (message) => {
            const imagePromises = message.imageUrls ? message.imageUrls.map(async (url) => {
                const base64Image = await fetchImage(url);
                return { type: "image_url", image_url: {url: `data:image/jpeg;base64,${base64Image}`} };
            }) : [];

            const images = await Promise.all(imagePromises);

            return {
                role: message.role,
                content: [
                    { type: "text", text: message.content },
                    ...images
                ],
            };
        }));

        const request = {
            model: model,
            max_tokens: maxTokens,
            messages: [
                {
                    role: "system",
                    content: systemMessage,
                },
                ...processedMessages,
            ],
            temperature: temperature
        };

        const completion = await openai.chat.completions.create(request);
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error while generating text:', error);
        return null;
    }
}

/**
 * Fetches an image from a URL and returns it as a base64 string
 */
async function fetchImage(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64'); // Use 'base64' encoding
    } catch (error) {
        console.error('Error while fetching image:', error);
        return null;
    }
}

export class OpenAiGpt implements Model {
    async generate(messages: BotMessage[], systemMessage: string, temperature: number, maxTokens: number): Promise<string> {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
