"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiGpt = exports.generate = void 0;
const OpenAI = require("openai");
require('dotenv').config({ path: __dirname + '/../../.env' });
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const model = "gpt-4o";
/**
 * Generate a response to a given prompt using the specified system message.
 * Takes an entire message history.
 */
async function generate(messages, systemMessage, temperature = 0, maxTokens = 4096) {
    try {
        // Sequentially fetch images as base64 strings
        const processedMessages = await Promise.all(messages.map(async (message) => {
            const imagePromises = message.imageUrls ? message.imageUrls.map(async (url) => {
                const base64Image = await fetchImage(url);
                return { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } };
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
    }
    catch (error) {
        console.error('Error while generating text:', error);
        return null;
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
        return Buffer.from(buffer).toString('base64'); // Use 'base64' encoding
    }
    catch (error) {
        console.error('Error while fetching image:', error);
        return null;
    }
}
class OpenAiGpt {
    async generate(messages, systemMessage, temperature, maxTokens) {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
exports.OpenAiGpt = OpenAiGpt;
