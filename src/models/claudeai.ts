import Anthropic from '@anthropic-ai/sdk';
const { getMessageHistoryOrCreateMessage, updateConversation } = require("../conversation");
import { Model } from './model';
import { BotMessage } from '../conversation';
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../../.env' });

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

const model = "claude-3-opus-20240229";

/**
 * Generate a response to a given prompt using the specified system message.
 * Takes an entire message history.
 */
export async function generate(messages: any[], systemMessage: string, temperature: number = 0, maxTokens: number = 4096): Promise<string> {
    try {
        const msgs = await messages.map(async (message) => ({
            role: message.role,
            content: [
                { type: "text", text: message.content },
                ...(message.imageUrls ? await processImageUrls(message) : [])
            ]
        }));

        const resolvedMsgs = await Promise.all(msgs);
        const completion = await anthropic.messages.create({
            model: model,
            max_tokens: maxTokens,
            system: systemMessage,
            temperature: temperature,
            messages: resolvedMsgs
        });
        return completion.content[0].text;
    } catch (error) {
        console.error('Error while generating text:', error);
    }
}

/**
 * Fetches an image from a URL and returns it as a base64 string
 */
async function fetchImage(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    }
    catch (error) {
        console.error('Error while fetching image:', error);
        return null;
    }
}

/**
 * Process image URLs in a message. Fetches the images and converts them to base64 strings.
 * Returns an array of image objects { type: "image", source: { type, media_type, data } }
*/
async function processImageUrls(message: any): Promise<any[]> {
    if (!message.imageUrls) return [];

    const processedImages = await Promise.all(message.imageUrls.map(async (url: string) => {
        if (!url) return null;
        const urlParts = url.split('.');
        let extension = urlParts[urlParts.length - 1];
        extension = extension.split('?')[0].toLowerCase();
        // infer mime type from extension
        // only supported types are png, jpg, jpeg, and webp
        let media_type: string;
        switch (extension) {
            case "png":
                media_type = "image/png";
                break;
            case "webp":
                media_type = "image/webp";
                break;
            case "jpg":
            case "jpeg":
                media_type = "image/jpeg";
                break;
            default:
                console.error(`[ClaudeAi] Unsupported image type: ${extension}`);
                return null;
        }

        // Fetch the image and convert it to a base64 string
        const imageBase64: string = await fetchImage(url);
        return {
            type: "image",
            source: { type: "base64", media_type: media_type, data: imageBase64 }
        };
    }));

    return processedImages.filter((image) => image !== null);
}

export class ClaudeAI implements Model {
    async generate(messages: BotMessage[], systemMessage: string, temperature: number, maxTokens: number): Promise<string> {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
