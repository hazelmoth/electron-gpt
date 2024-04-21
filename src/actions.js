"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikipediaSummaryAction = exports.ChannelMessageAction = exports.DirectMessageAction = exports.BotAction = void 0;
const wikipedia_1 = __importDefault(require("./wikipedia"));
/**
 * A class representing an action that the bot can take.
 * Has a signature (e.g. "[DM <@1234567890>] <message>") and a description.
 */
class BotAction {
    constructor(signature, description) {
        this.signature = signature;
        this.description = description;
    }
}
exports.BotAction = BotAction;
/**
 * A class representing an action that sends a direct message to a user.
 * Takes a discord client as a parameter.
 * [DM @1234567890] message
 */
class DirectMessageAction extends BotAction {
    constructor(client) {
        super("[DM @123456789] message", "Sends a direct message to the user with the specified ID.");
        this.client = client;
    }
    async execute(message) {
        // Extract the user ID and message from the input
        const matches = message.match(/^\[DM @(\d+)] ([\s\S]*)$/s);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [DM <@1234567890>] Hello!";
        }
        const userId = matches[1];
        const userMessage = matches[2];
        // Send the message to the user
        const user = this.client.users.cache.get(userId);
        if (user) {
            user.send(userMessage);
            return null;
        }
        else {
            return `User with ID ${userId} not found.`;
        }
    }
    matches(message) {
        const matches = message.startsWith("[DM @");
        return !!matches;
    }
}
exports.DirectMessageAction = DirectMessageAction;
/**
 * A class representing an action that sends a message to a channel.
 * Takes a discord client as a parameter.
 * [MSG #channel] message
 */
class ChannelMessageAction extends BotAction {
    constructor(client) {
        super("[MSG #1234567890] message", "Sends a message to the channel with the specified ID.");
        this.client = client;
    }
    async execute(message) {
        // Extract the channel ID and message from the input
        const matches = message.match(/^\[MSG #(\d+)] ([\s\S]*)$/s);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [MSG #1234567890] Hello!";
        }
        const channelId = matches[1];
        const channelMessage = matches[2];
        // Send the message to the channel
        const channel = this.client.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
            channel.send(channelMessage);
            return null;
        }
        else {
            return `Channel with ID ${channelId} not found.`;
        }
    }
    matches(message) {
        const matches = message.startsWith("[MSG #");
        return !!matches;
    }
}
exports.ChannelMessageAction = ChannelMessageAction;
/**
 * An action for querying a page extract from Wikipedia.
 * Takes a page name as a parameter.
* [WIKI page-name]
*/
class WikipediaSummaryAction extends BotAction {
    constructor() {
        super("[WIKI page name]", "Fetches a summary of the specified Wikipedia page.");
    }
    async execute(message) {
        // Extract the search term from the input
        const matches = message.match(/^\[WIKI ([\s\S]*)]$/s);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [SEARCHWIKI page name]";
        }
        const articleName = matches[1];
        try {
            const response = await (0, wikipedia_1.default)(articleName);
            return response;
        }
        catch (error) {
            return 'Failed to fetch page content from Wikipedia';
        }
    }
    matches(message) {
        const matches = message.startsWith("[WIKI ");
        return !!matches;
    }
}
exports.WikipediaSummaryAction = WikipediaSummaryAction;
