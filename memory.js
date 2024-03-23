// This file handles aggregating messages to keep the model's context finite.

const { generateTextGeneric } = require('./gptwrapper');

async function aggregate(messages) {

}

// prompt instructions for aggregation
const prompt = 
    "Combine the following message history into a single message detailing only the most important information. Max 200 chars. \n\n";

// Use GPT-3.5-turbo to generate a response
async function generateAggregatedResponse(messages) {
    var fullPrompt = prompt;
    for (var i = 0; i < messages.length; i++) {
        fullPrompt += messages[i].content + "\n\n";
    }
    const response = await generateTextGeneric(fullPrompt, "gpt-3.5-turbo");
    return response;
}

