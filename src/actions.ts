import { CustomClient } from './custom-client';
import { TextChannel } from 'discord.js';

/**
 * A class representing an action that the bot can take.
 * Has a signature (e.g. "[DM <@1234567890>] <message>") and a description.
 */
export abstract class BotAction {
    signature: string;
    description: string;

    constructor(signature: string, description: string) {
        this.signature = signature;
        this.description = description;
    }

    /**
     * Executes the action.
     * @param {string} message - The message that triggered the action.
     * @returns {string?} The system response to the action, if any.
     */
    abstract execute(message: string): string;

    /**
     * Whether the given message matches the action's signature.
     */
    abstract matches(message: string): boolean;
}

/**
 * A class representing an action that sends a direct message to a user.
 * Takes a discord client as a parameter.
 * [DM @1234567890] message
 */
export class DirectMessageAction extends BotAction {
    client: CustomClient;

    constructor(client: CustomClient) {
        super("[DM @user-id] message", "Sends a direct message to the specified user.");
        this.client = client;
    }

    execute(message: string): string {
        // Extract the user ID and message from the input
        const matches = message.match(/^\[DM <@(\d+)>] (.+)$/);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [DM <@1234567890>] Hello!";
        }

        const userId = matches[1];
        const userMessage = matches[2];

        // Send the message to the user
        const user = this.client.users.cache.get(userId);
        if (user) {
            user.send(userMessage);
            return `Sending message to <@${userId}>: ${userMessage}`;
        } else {
            return `User with ID ${userId} not found.`;
        }
    }

    matches(message: string): boolean {
        const matches = message.match(/^\[DM <@(\d+)>] (.+)$/);
        return !!matches;
    }
}

/**
 * A class representing an action that sends a message to a channel.
 * Takes a discord client as a parameter.
 * [MSG #channel] message
 */
export class ChannelMessageAction extends BotAction {
    client: CustomClient;

    constructor(client: CustomClient) {
        super("[MSG #channel] message", "Sends a message to the specified channel.");
        this.client = client;
    }

    execute(message: string): string {
        // Extract the channel ID and message from the input
        const matches = message.match(/^\[MSG <#(\d+)>] (.+)$/);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [MSG #1234567890] Hello!";
        }

        const channelId = matches[1];
        const channelMessage = matches[2];

        // Send the message to the channel
        const channel = this.client.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
            channel.send(channelMessage);
            return `Sending message to <#${channelId}>: ${channelMessage}`;
        } else {
            return `Channel with ID ${channelId} not found.`;
        }
    }

    matches(message: string): boolean {
        const matches = message.match(/^\[MSG <#(\d+)>] (.+)$/);
        return !!matches;
    }
}
