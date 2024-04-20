"use strict";
// action-bot.ts
// this bot outputs an action in response to a message
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionBot = exports.BotAction = void 0;
const actions_1 = require("./actions");
Object.defineProperty(exports, "BotAction", { enumerable: true, get: function () { return actions_1.BotAction; } });
class ActionBot {
    constructor(client) {
        this.client = client;
        this.actions = [
            new actions_1.DirectMessageAction(client),
            new actions_1.ChannelMessageAction(client),
        ];
    }
    async handleMessage(message) {
        for (const action of this.actions) {
            if (action.matches(message)) {
                return action.execute(message);
            }
        }
        return 'No action found for message.';
    }
}
exports.ActionBot = ActionBot;
