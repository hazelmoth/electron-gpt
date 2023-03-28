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
        await Conversation.update(
            { messages: JSON.stringify(messageHistory) },
            { where: { id } }
        );
        console.log("Conversation mise à jour :", id);
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la conversation :", error);
    }
}

async function getMessageHistoryOrCreateMessage(conversationId, prompt) {
    const [conversation, created] = await Conversation.findOrCreate({
        where: { id: conversationId },
        defaults: {
            id: conversationId,
            messages: JSON.stringify([{ role: 'user', content: prompt }])
        }
    });

    if (!created) {
        messageHistory = JSON.parse(conversation.messages);
        messageHistory.push({ role: 'user', content: prompt });
        await conversation.update({ messages: JSON.stringify(messageHistory) });
    } else {
        messageHistory = [{ role: 'user', content: prompt }];
    }

    return { messageHistory, conversationId };
}


(async () => {
    await sequelize.sync();
})();

module.exports = { getMessageHistoryOrCreateMessage, updateConversation };