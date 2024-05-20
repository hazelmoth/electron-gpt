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
                    content: [
                        { type: "text", text: message.content },
                        ...(message.imageUrls ? message.imageUrls.map((url) => ({ type: "image_url", image_url: { "url": url } })) : [])
                    ],
                })),
            ],
            temperature: temperature
        };
        const completion = await openai.chat.completions.create(request);
        return completion.choices[0].message.content;
    }
    catch (error) {
        console.error('Error while generating text:', error);
    }
}
exports.generate = generate;
class OpenAiGpt {
    async generate(messages, systemMessage, temperature, maxTokens) {
        return generate(messages, systemMessage, temperature, maxTokens);
    }
}
exports.OpenAiGpt = OpenAiGpt;
