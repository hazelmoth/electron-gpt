// action-bot.ts
// this bot outputs an action in response to a message

import { BotAction, DirectMessageAction, ChannelMessageAction } from './actions';
import { CustomClient } from './custom-client';

export { BotAction }; // Add this line to export the 'BotAction' class

export class ActionBot {
    client: CustomClient;
    actions: BotAction[];

    constructor(client: CustomClient) {
        this.client = client;
        this.actions = [
            new DirectMessageAction(client),
            new ChannelMessageAction(client),
        ];
    }

    async handleMessage(message: string): Promise<string> {
        for (const action of this.actions) {
            if (action.matches(message)) {
                return action.execute(message);
            }
        }

        return 'No action found for message.';
    }
}