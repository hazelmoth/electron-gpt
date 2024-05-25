"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeAI = exports.generate = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const { getMessageHistoryOrCreateMessage, updateConversation } = require("../conversation");
const dotenv = require('dotenv');
const sharp = require('sharp');
dotenv.config({ path: __dirname + '/../../.env' });
const anthropic = new sdk_1.default({
    apiKey: process.env.CLAUDE_API_KEY,
});
const model = "claude-3-opus-20240229";
const MAX_IMAGE_SIZE_MB = 4.5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const REDUCTION_FACTOR = 0.5; // Fixed reduction factor to halve the dimensions
const MAX_SCALING_ITERATIONS = 10; // Maximum number of iterations to scale down an image
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
        console.error('[ClaudeAi] Error while generating text:', error);
        throw error;
    }
}
exports.generate = generate;
/**
 * Fetches an image from a URL and returns it as a base64 string
 */
async function fetchImage(url) {
    try {
        console.log(`[ClaudeAi] Fetching image from URL: ${url}`);
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    }
    catch (error) {
        console.error('[ClaudeAi] Error while fetching image:', error);
        throw error;
    }
}
/**
 * Scales down an image if its size exceeds the specified limit.
 */
async function scaleDownImage(buffer, mediaType) {
    try {
        let image = sharp(buffer);
        let metadata = await image.metadata();
        let width = metadata.width;
        let height = metadata.height;
        let iterations = 0;
        while (buffer.length > MAX_IMAGE_SIZE_BYTES && iterations < MAX_SCALING_ITERATIONS) {
            width = Math.floor(width * REDUCTION_FACTOR);
            height = Math.floor(height * REDUCTION_FACTOR);
            console.log(`[ClaudeAi] Scaling down image to ${width}x${height}`);
            image = image.resize(width, height);
            buffer = await image.toBuffer();
            metadata = await image.metadata();
            iterations++;
        }
        if (iterations >= MAX_SCALING_ITERATIONS) {
            console.warn(`[ClaudeAi] Reached maximum iterations (${MAX_SCALING_ITERATIONS}) while scaling down image.`);
        }
        return buffer;
    }
    catch (error) {
        console.error('Error while scaling down image:', error);
        throw error;
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
        try {
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
            let imageBuffer = await fetchImage(url);
            if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
                console.log(`[ClaudeAi] Image size (${imageBuffer.length} bytes) exceeds limit, scaling down...`);
                imageBuffer = await scaleDownImage(imageBuffer, media_type);
            }
            const imageBase64 = imageBuffer.toString('base64');
            return {
                type: "image",
                source: { type: "base64", media_type: media_type, data: imageBase64 }
            };
        }
        catch (error) {
            console.error('[ClaudeAi] Error processing image URL:', error);
            return null;
        }
    }));
    return processedImages.filter((image) => image !== null);
}
class ClaudeAI {
    async generate(messages, systemMessage, temperature, maxTokens) {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
exports.ClaudeAI = ClaudeAI;
