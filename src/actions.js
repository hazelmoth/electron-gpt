"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpGetAction = exports.WikipediaAction = exports.ChannelMessageAction = exports.DirectMessageAction = exports.BotAction = void 0;
const wikipedia_1 = require("./wikipedia");
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
        // Max length of a message is 2000 characters
        if (matches[2].length > 2000) {
            return "Message is too long. Max length is 2000 characters.";
        }
        const userId = matches[1];
        const userMessage = matches[2];
        // Send the message to the user
        const user = this.client.users.cache.get(userId);
        if (user) {
            try {
                await user.send(userMessage);
                return null;
            }
            catch (error) {
                return `Error sending message to user with ID ${userId}.`;
            }
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
        if (matches[2].length > 2000) {
            return "Message is too long. Max length is 2000 characters.";
        }
        const channelId = matches[1];
        const channelMessage = matches[2];
        // Send the message to the channel
        const channel = this.client.channels.cache.get(channelId);
        if (channel && channel.isTextBased()) {
            try {
                await channel.send(channelMessage);
                return null;
            }
            catch (error) {
                return `Error sending message to channel with ID ${channelId}.`;
            }
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
 * An action for querying Wikipedia.
 * Takes a page name or a page name with a section name as a parameter.
 * [WIKI page name] or [WIKI page name#section name]
 */
class WikipediaAction extends BotAction {
    constructor() {
        super("[WIKI page name] or [WIKI page name#section name]", "Fetches the summary of a Wikipedia page or a specific section of the page.");
    }
    async execute(message) {
        // Extract the search term and section name from the input
        const matches = message.match(/^\[WIKI ([^\]]+)]$|^\[WIKI ([^\]]+)#([^\]]+)]$/s);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [WIKI page name] or [WIKI page name#section name]";
        }
        const articleName = matches[1] || matches[2];
        const sectionName = matches[3];
        try {
            if (sectionName) {
                const response = await (0, wikipedia_1.fetchSectionContent)(articleName, sectionName);
                return response;
            }
            else {
                const response = await (0, wikipedia_1.fetchPageContent)(articleName);
                return response;
            }
        }
        catch (error) {
            return 'Failed to fetch content from Wikipedia';
        }
    }
    matches(message) {
        const matches = message.startsWith("[WIKI ");
        return !!matches;
    }
}
exports.WikipediaAction = WikipediaAction;
/**
 * An action to make arbitrary HTTP requests.
 */
class HttpGetAction extends BotAction {
    constructor() {
        super("[HTTPGET-TEXT url]", "Makes a GET request to retrieve text from the specified URL. Text only. Truncates to 8000 chars.");
    }
    async execute(message) {
        // Extract the URL from the input
        const matches = message.match(/^\[HTTPGET-TEXT ([\s\S]*)]$/s);
        if (!matches) {
            return "Invalid syntax. Please use the following format: [HTTPGET-TEXT url]";
        }
        const url = matches[1];
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return `Failed to fetch URL: ${response.statusText}`;
            }
            const text = await response.text();
            const maxLength = 8000;
            return text.substring(0, maxLength);
        }
        catch (error) {
            return 'Failed to make HTTP request';
        }
    }
    matches(message) {
        const matches = message.startsWith("[HTTPGET-TEXT ");
        return !!matches;
    }
}
exports.HttpGetAction = HttpGetAction;
