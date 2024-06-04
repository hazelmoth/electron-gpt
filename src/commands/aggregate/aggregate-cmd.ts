import { BotMessage } from "../../conversation";

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: __dirname + '/.env' });

const botName = process.env.CONVERSATION_ID;
const prompt = `you are a discord bot called ${botName}. right now you are condensing your longterm memory of events.

you must output the following 2 sections in your response:

- first, one titled "FACTS I REMEMBER" that contains a numbered list of the most important things for you to remember.
    - this must always start with: "1 - i am a discord bot called ${botName}."
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

each of the two sections MUST BE UNDER no more than 30 items.
once you hit 30 items in a section, try to cut it down to 28 to make room for new memories.
start by cutting out the least important details, and combining related details together.
if there are recent events and old events that are equally unimportant, prioritize keeping the recent events.

include nothing other than the headers and bullet points. DO NOT offer any additional commentary, analysis, or explanation.`;

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
        const { generate } = require("../../models/openai");

        // get the conversation ID from env
        const conversationId = process.env.CONVERSATION_ID;
        const messageHistory: BotMessage[] = await getConversationFromID(conversationId);

        console.log('Aggregating conversation', conversationId);
        console.log('Messages string length:', messageHistory.length);

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
            summary = await generate(
                [{
                    role: 'user',
                    content: joinedMessages
                }], 
                prompt,
                0,
                2048
            );
            summary = "[PREVIOUS LONGTERM MEMORY]\n" + summary;
        } catch (error) {
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

        const newMessageHistory = messageHistory.slice(nextIndex);
        newMessageHistory.unshift({ role: 'user', content: summary, imageUrls: [] });

        try {
            await updateConversation(conversationId, newMessageHistory);
        } catch (error) {
            console.error("Error updating conversation:", error);
            await interaction.editReply({ content: 'Failed to update conversation history.' });
            return;
        }

        try {
            await interaction.editReply({ content: 'Aggregated message history for ' + conversationId });
        } catch (error) {
            console.error("Error replying to interaction:", error);
        }
    }
};

// Takes the first given fraction of the message history and aggregates it into one message using the given function.
// Returns the aggregated message as well as the index of first message not included in the aggregation.
function aggregateMessages(
    messageHistory: BotMessage[], 
    fraction: number, 
    aggregateFunction: (arg0: any[]) => any
): { msg: any; n: number } {
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
