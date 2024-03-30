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
// bot.ts
const { Client, GatewayIntentBits, Partials, ChannelType, Events, MessageMentions } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel]
});
const { generateText } = require('./claudeai');
const { generateTextGpt, generateTextGenericGpt } = require('./gptwrapper');
require('dotenv').config({ path: __dirname + '/.env' });
function generateAssistantResponse(prompt, conversationId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield generateText(prompt, conversationId);
            return response.assistantMessage;
        }
        catch (error) {
            console.error('Error in generateAssistantResponse:', error);
            throw error;
        }
    });
}
function generateResponseGPT3(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield generateTextGenericGpt(prompt, "gpt-3.5-turbo");
            return response;
        }
        catch (error) {
            console.error('Error in generateResponseGPT3:', error);
            throw error;
        }
    });
}
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
client.commands = new Map();
client.commands.set('setmodel', require('./commands/setmodel/setmodel-cmd'));
client.commands.set('aggregate', require('./commands/aggregate/aggregate-cmd'));
client.on(Events.InteractionCreate, (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!interaction.isChatInputCommand())
        return;
    const command = (_a = interaction.client.commands) === null || _a === void 0 ? void 0 : _a.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    try {
        yield command.execute(interaction);
    }
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            yield interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        }
        else {
            yield interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}));
client.on('messageCreate', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    // Do not respond to messages sent by the bot itself
    if (msg.author.id === client.user.id)
        return;
    console.log(`RECEIVED:"${msg.content}"`);
    const isMentioned = msg.mentions.has(client.user);
    // If this is a guild message not mentioning us, we prompt GPT-3.5 Turbo to ask if we should respond
    // based on the last 10 messages in the channel.
    let respondToNonMention = false;
    if (msg.guild && !isMentioned) {
        try {
            const channel = yield msg.guild.channels.fetch(msg.channel.id);
            let last10Messages = yield channel.messages.fetch({ limit: 10 });
            last10Messages = last10Messages.reverse();
            // Map each message to "[username][time elapsed] message content", or if it's from the bot, "[username (YOU)][time elapsed] message content"
            last10Messages = last10Messages.map(m => {
                let timeElapsed = timeElapsedString(m.createdTimestamp);
                if (m.author.id === client.user.id) {
                    return `[${m.author.displayName} (YOU)][${timeElapsed}] ${m.content}`;
                }
                else {
                    return `[${m.author.displayName}][${timeElapsed}] ${m.content}`;
                }
            });
            last10Messages = last10Messages.map(m => replaceMentions(m, client));
            const context = last10Messages.join('\n');
            const contextCheckPrompt = `You are a discord user with the username "${client.user.displayName}". There's a new message in the public channel #${channel.name}. The last 10 messages (in chronological order) are:\n\n${context}\n\nDo you respond? (is it addressed to you? Relevant to you? Part of a conversation you're in? Someone trying to get your attention? A follow-up to something you said? A question following something you said? Something controversial about robots? Don't respond to messages directed at someone else.) ONLY return "Yes" or "No".`;
            const response = yield generateResponseGPT3(contextCheckPrompt);
            if (response.toLowerCase() === 'yes') {
                console.log(`Decided to respond to message "${msg.content}"`);
                respondToNonMention = true;
            }
            else {
                console.log(`Context check yielded response "${response}". Not responding to message.`);
            }
        }
        catch (error) {
            console.error("Error in client.on('messageCreate'):", error);
        }
    }
    if (msg.channel.type === ChannelType.DM || (msg.guild && isMentioned) || respondToNonMention) {
        try {
            let prompt = msg.content;
            prompt = replaceMentions(prompt, client);
            prompt = `[${msg.author.displayName}] ${prompt}`;
            console.log(`PROMPT:"${prompt}"`);
            yield msg.channel.sendTyping();
            const response = yield generateAssistantResponse(prompt, msg.author.id);
            yield sendMultiLineMessage(msg.channel, response);
        }
        catch (error) {
            yield msg.reply('⚠️ ERROR ERROR something broke ⚠️');
            console.error("Error in client.on('messageCreate'):", error);
        }
    }
}));
// an async function that will break up a message by line breaks and send each line as a separate message, waiting briefly between each one.
// also breaks up by sentences (. or ? or !), only if the combined sentence is longer than 40 characters.
// never breaks up a message that is longer than 300 characters in total.
// never breaks up a message containing ``` (code blocks).
function sendMultiLineMessage(channel, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (message.includes('```') || message.length > 300) {
            yield channel.send(message);
            return;
        }
        const lines = message.split('\n');
        for (const line of lines) {
            if (line.length > 40) {
                const sentences = line.split(/(?<=[.?!])\s+(?=[a-z])/);
                for (const sentence of sentences) {
                    if (sentence.trim().length === 0)
                        continue;
                    yield new Promise(resolve => setTimeout(resolve, 250));
                    yield channel.send(sentence);
                }
                continue;
            }
            if (line.trim().length === 0)
                continue;
            yield new Promise(resolve => setTimeout(resolve, 250));
            yield channel.send(line);
        }
    });
}
// Replace all mentions in a message with <@nickname> or <@nickname (YOU)>
function replaceMentions(msgContent, client) {
    let result = msgContent;
    const matches = msgContent.matchAll(/<@!?([0-9]+)>/g);
    for (const match of matches) {
        const id = match[1];
        const user = client.users.cache.get(id);
        if (user) {
            if (user.id === client.user.id) {
                result = result.replace(match[0], `<@${client.user.displayName} (YOU)>`);
                console.log(`Replacing mention ${match[0]} with <@${client.user.displayName} (YOU)>`);
            }
            else {
                result = result.replace(match[0], `<@${user.displayName}>`);
                console.log(`Replacing mention ${match[0]} with ${user.displayName}`);
            }
        }
    }
    return result;
}
function timeElapsedString(timestamp) {
    let timeElapsed = Date.now() - timestamp;
    timeElapsed = Math.floor(timeElapsed / 1000);
    if (timeElapsed < 60) {
        return `${timeElapsed} seconds ago`;
    }
    timeElapsed = Math.floor(timeElapsed / 60);
    if (timeElapsed < 60) {
        if (timeElapsed === 1) {
            return '1 minute ago';
        }
        else {
            return `${timeElapsed} minutes ago`;
        }
    }
    timeElapsed = Math.floor(timeElapsed / 60);
    if (timeElapsed < 24) {
        if (timeElapsed === 1) {
            return '1 hour ago';
        }
        else {
            return `${timeElapsed} hours ago`;
        }
    }
    timeElapsed = Math.floor(timeElapsed / 24);
    if (timeElapsed === 1) {
        return '1 day ago';
    }
    else {
        return `${timeElapsed} days ago`;
    }
}
client.login(process.env.BOT_TOKEN);
