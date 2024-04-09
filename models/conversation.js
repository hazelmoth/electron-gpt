"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
function updateConversation(id, messageHistory) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield Conversation.update({ messages: JSON.stringify(messageHistory) }, { where: { id } });
        }
        catch (error) {
            console.error("Error updating conversation :", error);
        }
    });
}
/* Adds the given prompt to the message history of the conversation with the given ID.
 *  If the conversation does not exist, it is created with the given prompt as the first message.
/  Returns the message history and the conversation ID.
*/
function getMessageHistoryOrCreateMessage(conversationId, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        const [conversation, created] = yield Conversation.findOrCreate({
            where: { id: conversationId },
            defaults: {
                id: conversationId,
                messages: JSON.stringify([{ role: 'user', content: prompt }])
            }
        });
        let messageHistory;
        if (!created) {
            messageHistory = JSON.parse(conversation.messages);
            messageHistory.push({ role: 'user', content: prompt });
            yield conversation.update({ messages: JSON.stringify(messageHistory) });
        }
        else {
            messageHistory = [{ role: 'user', content: prompt }];
        }
        messageHistory = makeAlternating(messageHistory);
        return { messageHistory, conversationId };
    });
}
function getConversations() {
    return __awaiter(this, void 0, void 0, function* () {
        const conversations = yield Conversation.findAll();
        return conversations.map((conversation) => {
            return {
                id: conversation.id,
                messages: conversation.messages,
            };
        });
    });
}
function getConversationFromID(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conversation = yield Conversation.findOne({ where: { id } });
        if (conversation) {
            return {
                id: conversation.id,
                messages: conversation.messages,
            };
        }
        return null;
    });
}
function deleteConversation(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const deletedRowCount = yield Conversation.destroy({
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
    });
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
            alternatingMessages.push(lastMessage);
        }
        else {
            alternatingMessages.push(message);
        }
        lastRole = message.role;
    }
    return alternatingMessages;
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield sequelize.sync();
}))();
module.exports = { getMessageHistoryOrCreateMessage, updateConversation, getConversations, getConversationFromID, deleteConversation, aggregateMessages };
