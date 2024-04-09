// Command to aggregate the first half of the message history into a single message

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: __dirname + '/.env' });

const prompt = "you are a discord bot called Melu. right now you are condensing your memory of events. for the following message history, return a concise bullet-point first-person summary of 1000 words or less that summarizes the most important things to remember about the message history. if there's already a message summarizing previous info, FULLY INCLUDE THAT CONTEXT in your summary; don't just continue where it leaves off. if there is nothing important, just say whatever details there are. include nothing other than the bullet points. do not offer any additional commentary, analysis, or explanation.";

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

        const { getMessageHistoryOrCreateMessage, updateConversation, getConversations, getConversationFromID, deleteConversation, aggregateMessages } = require('../../models/conversation');
        const { generateTextGeneric } = require("../../claudeai");
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
                summary = "[PREVIOUS MEMORY]\n" + summary;
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
