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

export type BotMessage = {
    role: string;
    content: string;
    imageUrls: string[];
};

export async function updateConversation(id, messageHistory) {
    try {
        await Conversation.update(
            { messages: JSON.stringify(messageHistory) },
            { where: { id } }
        );
    } catch (error) {
        console.error("Error updating conversation :", error);
    }
}

/* Adds a user message to the conversation with the given ID.
 * If the conversation does not exist, it is created with the given message as the first message.
 * Returns the message history and the conversation ID.
*/
export async function addUserMessageToConversation(conversationId: string, message: string, imageUrls: string[] = [])
: Promise<{ messageHistory: BotMessage[], conversationId: string }> 
{
    return await addMessageToConversation(conversationId, message, "user", imageUrls);
}

/**
 * Adds a message to the conversation with the given ID.
 * If the conversation does not exist, it is created with the given message as the first message.
 * Returns the message history and the conversation ID.
 */
export async function addMessageToConversation(conversationId: string, message: string, role: string, imageUrls: string[] = [])
: Promise<{ messageHistory: BotMessage[], conversationId: string }> {
    const [conversation, created] = await Conversation.findOrCreate({
        where: { id: conversationId },
        defaults: {
            id: conversationId,
            messages: JSON.stringify([{ role: role, content: message, imageUrls: imageUrls}])
        }
    });

    let messageHistory: BotMessage[];

    if (!created) {
        messageHistory = JSON.parse(conversation.messages);
        messageHistory.push({ role: role, content: message, imageUrls: imageUrls });
        await conversation.update({ messages: JSON.stringify(messageHistory) });
    } else {
        messageHistory = [{ role: role, content: message, imageUrls: imageUrls }];
    }

    messageHistory = makeAlternating(messageHistory);

    return { messageHistory, conversationId };
}

async function getConversations() {
    const conversations = await Conversation.findAll();
    return conversations.map((conversation: { id: any; messages: any; }) => {
        return {
            id: conversation.id,
            messages: conversation.messages,
        };
    });
}

async function getConversationFromID(id) : Promise<BotMessage[]> {
    const conversation = await Conversation.findOne({ where: { id } });
    if (conversation) {
        return JSON.parse(conversation.messages);
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
    } catch (error) {
        console.error("Error deleting conversation :", error);
        return false;
    }
}

// Combines adjacent messages from the same role into one message
// so that the conversation alternates between user and assistant.
function makeAlternating(messageHistory: BotMessage[]): BotMessage[] {
    let alternatingMessages = [];
    let lastRole = null;
    for (const message of messageHistory) {
        if (lastRole === message.role) {
            const lastMessage = alternatingMessages.pop();
            lastMessage.content += "\n\n" + message.content;
            lastMessage.imageUrls = (lastMessage.imageUrls || []).concat(message.imageUrls);
            alternatingMessages.push(lastMessage);
        } else {
            alternatingMessages.push({ ...message });
        }
        lastRole = message.role;
    }
    return alternatingMessages;
}


(async () => {
    await sequelize.sync();
})();

module.exports = { addUserMessageToConversation, addMessageToConversation, updateConversation, getConversations, getConversationFromID, deleteConversation };
