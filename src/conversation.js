"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMessageToConversation = exports.addUserMessageToConversation = exports.updateConversation = void 0;
const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../database");
const Conversation = sequelize.define("Conversation", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    messages: {
        type: DataTypes.JSON,
        allowNull: false
    }
});
async function updateConversation(id, messageHistory) {
    try {
        await Conversation.update({ messages: JSON.stringify(messageHistory) }, { where: { id } });
    }
    catch (error) {
        console.error("Error updating conversation :", error);
    }
}
exports.updateConversation = updateConversation;
/* Adds a user message to the conversation with the given ID.
 * If the conversation does not exist, it is created with the given message as the first message.
 * Returns the message history and the conversation ID.
*/
async function addUserMessageToConversation(conversationId, message, imageUrls = []) {
    return await addMessageToConversation(conversationId, message, "user", imageUrls);
}
exports.addUserMessageToConversation = addUserMessageToConversation;
/**
 * Adds a message to the conversation with the given ID.
 * If the conversation does not exist, it is created with the given message as the first message.
 * Returns the message history and the conversation ID.
 */
async function addMessageToConversation(conversationId, message, role, imageUrls = []) {
    const [conversation, created] = await Conversation.findOrCreate({
        where: { id: conversationId },
        defaults: {
            id: conversationId,
            messages: JSON.stringify([{ role: role, content: message, imageUrls: imageUrls }])
        }
    });
    let messageHistory;
    if (!created) {
        messageHistory = JSON.parse(conversation.messages);
        messageHistory.push({ role: role, content: message, imageUrls: imageUrls });
        await conversation.update({ messages: JSON.stringify(messageHistory) });
    }
    else {
        messageHistory = [{ role: role, content: message, imageUrls: imageUrls }];
    }
    messageHistory = makeAlternating(messageHistory);
    return { messageHistory, conversationId };
}
exports.addMessageToConversation = addMessageToConversation;
async function getConversations() {
    const conversations = await Conversation.findAll();
    return conversations.map((conversation) => {
        return {
            id: conversation.id,
            messages: conversation.messages,
        };
    });
}
async function getConversationFromID(id) {
    const conversation = await Conversation.findOne({ where: { id } });
    if (conversation) {
        return {
            id: conversation.id,
            messages: conversation.messages,
        };
    }
    return null;
}
async function deleteConversation(id) {
    try {
        const deletedRowCount = await Conversation.destroy({
            where: {
                id: id
            }
        });
        return true;
    }
    catch (error) {
        console.error("Error deleting conversation :", error);
        return false;
    }
}
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
// Combines adjacent messages from the same role into one message
// so that the conversation alternates between user and assistant.
function makeAlternating(messageHistory) {
    let alternatingMessages = [];
    let lastRole = null;
    for (const message of messageHistory) {
        if (lastRole === message.role) {
            const lastMessage = alternatingMessages.pop();
            lastMessage.content += "\n\n" + message.content;
            lastMessage.imageUrls = (lastMessage.imageUrls || []).concat(message.imageUrls);
            alternatingMessages.push(lastMessage);
        }
        else {
            alternatingMessages.push({ ...message });
        }
        lastRole = message.role;
    }
    return alternatingMessages;
}
(async () => {
    await sequelize.sync();
})();
module.exports = { addUserMessageToConversation, addMessageToConversation, updateConversation, getConversations, getConversationFromID, deleteConversation, aggregateMessages };
