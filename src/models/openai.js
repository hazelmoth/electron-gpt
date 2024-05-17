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
