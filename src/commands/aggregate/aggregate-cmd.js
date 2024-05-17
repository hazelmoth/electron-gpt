// Command to aggregate the first half of the message history into a single message

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: __dirname + '/.env' });

const prompt = `you are a discord bot called Melu. right now you are condensing your longterm memory of events.

you must output the following 2 sections in your response:

- first, one titled "FACTS I REMEMBER" that contains a bullet-point list of the most important things for you to remember.
    - this must always start with: "- i am a discord bot called Melu."
    - if there are already facts in the input, keep them. DO NOT FORGET IMPORTANT DETAILS. Update outdated facts as needed.
    - only include things that are always true, not specific to the current conversation.
    - DON'T include general knowledge or trivia! only things specific to you or especially important to remember.
    - remove facts that don't meet these criteria or are no longer relevant.
    - use absolute dates instead of relative ones (e.g. "2022" instead of "last year").
    - these don't need to be chronological; feel free to reorder them or update them however makes sense.
- second, one titled "EVENTS I REMEMBER" that contains a bullet-point list of the most important events that have happened to you.
    - you don't need to track unimportant details like a specific technical question someone asked you.

if there is already past memory in the input, FULLY INCLUDE THAT CONTEXT in your summary. DO NOT FORGET IMPORTANT DETAILS. 
make sure to RETAIN important details like the identities of people you've met. 

each of the two sections MUST BE UNDER 1000 words (so collectively 2000 words max). 
if a section is too long, start cutting out the least important details, or combining related details together.

include nothing other than the headers and bullet points. DO NOT offer any additional commentary, analysis, or explanation.`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aggregate')
        .setDescription('Aggregate the first half of the message history into a single message.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        if (interaction.user.id !== process.env.ADMIN_USERID) {
            await interaction.reply({ content: 'You do not have permission to use this command.',
                ephemeral: true });
            return;
        }
        console.log('Running aggregate command')

        const { getMessageHistoryOrCreateMessage, updateConversation, getConversations, getConversationFromID, deleteConversation, aggregateMessages } = require('../../conversation');
        const { generateTextGeneric } = require("../../models/claudeai");
        const conversations = await getConversations();
        console.log('Found ' + conversations.length + ' conversations');
        
        for (const conversation of conversations) {
            console.log('Aggregating conversation ' + conversation.id);
            console.log('Messages string length: ' + conversation.messages.length);
            const { messageHistory, conversationId } = await getMessageHistoryOrCreateMessage(conversation.id, '');
            const aggregateResult = aggregateMessages(messageHistory, 0.5, (messages) => {
                return messages.map((message) => message.content).join('\n');
            });
            const joinedMessages = aggregateResult.msg;
            const nextIndex = aggregateResult.n;
            
            let summary = "";
            try {
                summary = await generateTextGeneric(prompt + '\n\n' + joinedMessages, "claude-3-opus-20240229");
                summary = "[PREVIOUS LONGTERM MEMORY]\n" + summary;
            } catch (error) {
                console.error("Error generating summary:", error);
            }

            if (summary === '' || summary === null || summary === undefined) {
                console.log('Failed to generate summary');
                continue;
            }

            const newMessageHistory = messageHistory.slice(nextIndex);
            // Push to the beginning of the message history (has to start with user message)
            newMessageHistory.unshift({ role: 'user', content: summary });

            console.log('Aggregated message count: ' + nextIndex)
            console.log('New message history length: ' + newMessageHistory.length)


            await updateConversation(conversation.id, newMessageHistory);
        }
        try {
            await interaction.editReply({ content: 'Aggregated message history for ' + conversations.length + ' conversations.'});
        } catch (error) {
            console.error("Error replying to interaction:", error);
        }
    }
};
