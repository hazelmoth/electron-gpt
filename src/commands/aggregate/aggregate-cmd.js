"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("../../models/openai");
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: __dirname + '/.env' });
const botName = process.env.CONVERSATION_ID;
const maxFacts = 30;
const maxEvents = 30;
const prompt = `you are a discord bot called ${botName}. right now you are condensing your longterm memory of events.

you must output the following 2 sections in your response:

- first, one titled "FACTS I REMEMBER" that contains a numbered list of the most important things for you to remember.
    - this must always start with: "1. i am a discord bot called ${botName}."
    - if there are already facts in the input, keep them. DO NOT FORGET IMPORTANT DETAILS. Update outdated facts as needed.
    - only include things that are always true, not specific to the current conversation.
    - DON'T include general knowledge or trivia! only things specific to you or especially important to remember.
    - remove facts that don't meet these criteria or are no longer relevant.
    - use absolute dates instead of relative ones (e.g. "2022" instead of "last year").
    - these don't need to be chronological; feel free to reorder them or update them however makes sense.
- second, one titled "EVENTS I REMEMBER" that contains a numbered list of the most important events that have happened to you.
    - you don't need to track unimportant details like a specific technical question someone asked you.

if there is already past memory in the input, FULLY INCLUDE THAT CONTEXT in your summary. DO NOT FORGET IMPORTANT DETAILS. 
make sure to RETAIN important details like the identities of people you've met. 

include nothing other than the headers and bullet points. DO NOT offer any additional commentary, analysis, or explanation.`;
const condenseLongtermMemoryPrompt = `you are a discord bot called ${botName}. 
right now you are condensing your longterm memory of events.
given 2 lists of facts and events, you must return the same lists but condensed so that there are no more than 
${maxFacts} facts and ${maxEvents} events. do this by removing the facts and events that are the least important 
to remember, and/or by combining related facts and events together.
if there are recent events and old events that are equally unimportant, prioritize keeping the recent events.
if there are already fewer than ${maxFacts} facts or ${maxEvents} events, return the original list(s).
return only the headers and bullet points. DO NOT offer any additional comments, analysis, or explanation.`;
module.exports = {
    data: new SlashCommandBuilder()
        .setName('aggregate')
        .setDescription('Aggregate the first half of the message history into a single message.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        if (interaction.user.id !== process.env.ADMIN_USERID) {
            await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }
        const { updateConversation, getConversationFromID } = require('../../conversation');
        // get the conversation ID from env
        const conversationId = process.env.CONVERSATION_ID;
        const messageHistory = await getConversationFromID(conversationId);
        const model = new openai_1.OpenAiGpt();
        console.log(`Aggregating conversation: "${conversationId}". Message count: ${messageHistory.length}`);
        const aggregateResult = aggregateMessages(messageHistory, 0.5, (messages) => {
            return messages.map((message) => message.content).join('\n');
        });
        if (!aggregateResult.msg) {
            await interaction.editReply({ content: 'Failed to aggregate messages.' });
            return;
        }
        const joinedMessages = aggregateResult.msg;
        const nextIndex = aggregateResult.n;
        let summary = "";
        try {
            summary = await model.generate([{
                    role: 'user',
                    content: joinedMessages,
                    imageUrls: []
                }], prompt, 0, 2048);
            summary = "[PREVIOUS LONGTERM MEMORY]\n" + summary;
        }
        catch (error) {
            console.error("Error generating summary:", error);
            await interaction.editReply({ content: 'Failed to generate summary.' });
            return;
        }
        if (!summary) {
            console.log('Failed to generate summary');
            await interaction.editReply({ content: 'Failed to generate summary.' });
            return;
        }
        console.log(`\n\n${summary}\n\n`);
        if (isMemorySection(summary) && memoryNeedsCondensing(summary)) {
            console.log("Condensing memory...");
            summary = await condenseMemorySection(summary, model);
            console.log(`\n\n${summary}\n\n`);
        }
        const newMessageHistory = messageHistory.slice(nextIndex);
        newMessageHistory.unshift({ role: 'user', content: summary, imageUrls: [] });
        try {
            await updateConversation(conversationId, newMessageHistory);
        }
        catch (error) {
            console.error("Error updating conversation:", error);
            await interaction.editReply({ content: 'Failed to update conversation history.' });
            return;
        }
        try {
            await interaction.editReply({ content: 'Aggregated message history for ' + conversationId });
        }
        catch (error) {
            console.error("Error replying to interaction:", error);
        }
    }
};
// Takes the first given fraction of the message history and aggregates it into one message using the given function.
// Returns the aggregated message as well as the index of first message not included in the aggregation.
function aggregateMessages(messageHistory, fraction, aggregateFunction) {
    const messageCount = messageHistory.length;
    let countToAggregate = Math.floor(fraction * messageCount);
    // only do an even number of messages
    if (countToAggregate % 2 !== 0) {
        countToAggregate--;
    }
    if (countToAggregate <= 0) {
        console.log("Not enough messages to aggregate");
        return { msg: null, n: 0 };
    }
    const messages = messageHistory.slice(0, countToAggregate);
    let aggregatedMessage = aggregateFunction(messages);
    return { msg: aggregatedMessage, n: countToAggregate };
}
// Condense an existing facts/memory section by prompting the LLM to remove the least important details.
// Returns the new condensed section.
async function condenseMemorySection(text, model) {
    let condensedSection = text;
    try {
        condensedSection = await model.generate([{ role: 'user', content: text, imageUrls: [] }], condenseLongtermMemoryPrompt, 0, 2048);
    }
    catch (error) {
        console.error("Error condensing memory section:", error);
    }
    return condensedSection;
}
// Returns whether the given text is a facts/memory section.
function isMemorySection(text) {
    return text.includes("FACTS I REMEMBER") || text.includes("EVENTS I REMEMBER");
}
// Returns whether the given LTM section has either the facts or events section full.
function memoryNeedsCondensing(text) {
    // Find all numbers at the start of lines
    const numbers = text.match(/^\d+/gm);
    if (!numbers)
        return false;
    for (let i = 0; i < numbers.length; i++) {
        if (parseInt(numbers[i]) > maxFacts || parseInt(numbers[i]) > maxEvents) {
            // assumes that the maximums are the same ;p
            return true;
        }
    }
}
