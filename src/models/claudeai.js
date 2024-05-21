"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAI = exports.generate = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const { getMessageHistoryOrCreateMessage, updateConversation } = require("../conversation");
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../../.env' });
const anthropic = new sdk_1.default({
    apiKey: process.env.CLAUDE_API_KEY,
});
const model = "claude-3-opus-20240229";
/**
 * Generate a response to a given prompt using the specified system message.
 * Takes an entire message history.
 */
async function generate(messages, systemMessage, temperature = 0, maxTokens = 4096) {
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
    }
    catch (error) {
        console.error('Error while generating text:', error);
    }
}
exports.generate = generate;
/**
 * Fetches an image from a URL and returns it as a base64 string
 */
async function fetchImage(url) {
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
async function processImageUrls(message) {
    if (!message.imageUrls)
        return [];
    const processedImages = await Promise.all(message.imageUrls.map(async (url) => {
        if (!url)
            return null;
        const urlParts = url.split('.');
        let extension = urlParts[urlParts.length - 1];
        extension = extension.split('?')[0].toLowerCase();
        // infer mime type from extension
        // only supported types are png, jpg, jpeg, and webp
        let media_type;
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
        const imageBase64 = await fetchImage(url);
        return {
            type: "image",
            source: { type: "base64", media_type: media_type, data: imageBase64 }
        };
    }));
    return processedImages.filter((image) => image !== null);
}
class ClaudeAI {
    async generate(messages, systemMessage, temperature, maxTokens) {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
exports.ClaudeAI = ClaudeAI;
