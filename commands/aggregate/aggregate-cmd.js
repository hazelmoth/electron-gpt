// Command to aggregate the first half of the message history into a single message

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aggregate')
        .setDescription('Aggregate the first half of the message history into a single message.'),
    async execute(interaction) {
        if (interaction.user.id !== process.env.ADMIN_USERID) {
            await interaction.reply({ content: 'You do not have permission to use this command.',
                ephemeral: true });
            return;
        }
        console.log('Running aggregate command')
        const { getMessageHistoryOrCreateMessage, updateConversation, getConversations, getConversationFromID, deleteConversation, aggregateMessages } = require("../models/conversation");
        const { generateText } = require("../gptwrapper");
        const conversations = await getConversations();
        console.log('Found ' + conversations.length + ' conversations');
        for (const conversation of conversations) {
            console.log('Aggregating conversation ' + conversation.id);
            console.log('Message count: ' + conversation.messages.length);
            const { messageHistory, conversationId } = await getMessageHistoryOrCreateMessage(conversation.id, '');
            const aggregatedMessage = aggregateMessages(messageHistory, 0.5, (messages) => {
                return messages.map((message) => message.content).join('\n');
            });
            await updateConversation(conversation.id, aggregatedMessage);
        }
        await interaction.reply({ content: 'Aggregated the first half of the message history into a single message for all conversations.',
            ephemeral: true });
    }
};
