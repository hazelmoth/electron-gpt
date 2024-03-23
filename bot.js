var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var _a = require('discord.js'), Client = _a.Client, GatewayIntentBits = _a.GatewayIntentBits, Partials = _a.Partials, ChannelType = _a.ChannelType, Events = _a.Events, MessageMentions = _a.MessageMentions;
var client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel]
});
var _b = require('./gptwrapper'), generateText = _b.generateText, generateTextGeneric = _b.generateTextGeneric;
require('dotenv').config({ path: __dirname + '/.env' });
function generateAssistantResponse(prompt, conversationId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, generateText(prompt, conversationId)];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.assistantMessage];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error in generateAssistantResponse:', error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function generateResponseGPT3(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, generateTextGeneric(prompt, "gpt-3.5-turbo")];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error in generateResponseGPT3:', error_2);
                    throw error_2;
                case 3: return [2 /*return*/];
            }
        });
    });
}
client.on('ready', function () {
    console.log("Logged in as ".concat(client.user.tag, "!"));
});
client.commands = new Map();
client.commands.set('setmodel', require('./commands/setmodel/setmodel-cmd'));
client.on(Events.InteractionCreate, function (interaction) { return __awaiter(_this, void 0, void 0, function () {
    var command, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!interaction.isChatInputCommand())
                    return [2 /*return*/];
                command = (_a = interaction.client.commands) === null || _a === void 0 ? void 0 : _a.get(interaction.commandName);
                if (!command) {
                    console.error("No command matching ".concat(interaction.commandName, " was found."));
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 8]);
                return [4 /*yield*/, command.execute(interaction)];
            case 2:
                _b.sent();
                return [3 /*break*/, 8];
            case 3:
                error_3 = _b.sent();
                console.error(error_3);
                if (!(interaction.replied || interaction.deferred)) return [3 /*break*/, 5];
                return [4 /*yield*/, interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })];
            case 4:
                _b.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7: return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
client.on('messageCreate', function (msg) { return __awaiter(_this, void 0, void 0, function () {
    var isMentioned, respondToNonMention, channel, last10Messages, context, contextCheckPrompt, response, error_4, prompt_1, response, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Do not respond to messages sent by the bot itself
                if (msg.author.id === client.user.id)
                    return [2 /*return*/];
                console.log("RECEIVED:\"".concat(msg.content, "\""));
                isMentioned = msg.mentions.has(client.user);
                respondToNonMention = false;
                if (!(msg.guild && !isMentioned)) return [3 /*break*/, 6];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, msg.guild.channels.fetch(msg.channel.id)];
            case 2:
                channel = _a.sent();
                return [4 /*yield*/, channel.messages.fetch({ limit: 10 })];
            case 3:
                last10Messages = _a.sent();
                last10Messages = last10Messages.reverse();
                // Map each message to "[username][time elapsed] message content", or if it's from the bot, "[username (YOU)][time elapsed] message content"
                last10Messages = last10Messages.map(function (m) {
                    var timeElapsed = timeElapsedString(m.createdTimestamp);
                    if (m.author.id === client.user.id) {
                        return "[".concat(m.author.displayName, " (YOU)][").concat(timeElapsed, "] ").concat(m.content);
                    }
                    else {
                        return "[".concat(m.author.displayName, "][").concat(timeElapsed, "] ").concat(m.content);
                    }
                });
                last10Messages = last10Messages.map(function (m) { return replaceMentions(m, client); });
                context = last10Messages.join('\n');
                contextCheckPrompt = "You are a discord user with the username \"".concat(client.user.displayName, "\". There's a new message in the public channel #").concat(channel.name, ". The last 10 messages (in chronological order) are:\n\n").concat(context, "\n\nDo you respond? (is it addressed to you? Relevant to you? Part of a conversation you're in? Someone trying to get your attention? A follow-up to something you said? A question following something you said? Something controversial about robots? Don't respond to messages directed at someone else.) ONLY return \"Yes\" or \"No\".");
                return [4 /*yield*/, generateResponseGPT3(contextCheckPrompt)];
            case 4:
                response = _a.sent();
                if (response.toLowerCase() === 'yes') {
                    console.log("Decided to respond to message \"".concat(msg.content, "\""));
                    respondToNonMention = true;
                }
                else {
                    console.log("Context check yielded response \"".concat(response, "\". Not responding to message."));
                }
                return [3 /*break*/, 6];
            case 5:
                error_4 = _a.sent();
                console.error("Error in client.on('messageCreate'):", error_4);
                return [3 /*break*/, 6];
            case 6:
                if (!(msg.channel.type === ChannelType.DM || (msg.guild && isMentioned) || respondToNonMention)) return [3 /*break*/, 13];
                _a.label = 7;
            case 7:
                _a.trys.push([7, 11, , 13]);
                prompt_1 = msg.content;
                prompt_1 = replaceMentions(prompt_1, client);
                prompt_1 = "[".concat(msg.author.displayName, "] ").concat(prompt_1);
                console.log("PROMPT:\"".concat(prompt_1, "\""));
                return [4 /*yield*/, msg.channel.sendTyping()];
            case 8:
                _a.sent();
                return [4 /*yield*/, generateAssistantResponse(prompt_1, msg.author.id)];
            case 9:
                response = _a.sent();
                return [4 /*yield*/, sendMultiLineMessage(msg.channel, response)];
            case 10:
                _a.sent();
                return [3 /*break*/, 13];
            case 11:
                error_5 = _a.sent();
                return [4 /*yield*/, msg.reply('⚠️ ERROR ERROR something broke ⚠️')];
            case 12:
                _a.sent();
                console.error("Error in client.on('messageCreate'):", error_5);
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
// an async function that will break up a message by line breaks and send each line as a separate message, waiting briefly between each one.
// also breaks up by sentences (. or ? or !), only if the combined sentence is longer than 40 characters.
// never breaks up a message that is longer than 300 characters in total.
// never breaks up a message containing ``` (code blocks).
function sendMultiLineMessage(channel, message) {
    return __awaiter(this, void 0, void 0, function () {
        var lines, _i, lines_1, line, sentences, _a, sentences_1, sentence;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(message.includes('```') || message.length > 300)) return [3 /*break*/, 2];
                    return [4 /*yield*/, channel.send(message)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
                case 2:
                    lines = message.split('\n');
                    _i = 0, lines_1 = lines;
                    _b.label = 3;
                case 3:
                    if (!(_i < lines_1.length)) return [3 /*break*/, 13];
                    line = lines_1[_i];
                    if (!(line.length > 40)) return [3 /*break*/, 9];
                    sentences = line.split(/(?<=[.?!])\s+(?=[a-z])/);
                    _a = 0, sentences_1 = sentences;
                    _b.label = 4;
                case 4:
                    if (!(_a < sentences_1.length)) return [3 /*break*/, 8];
                    sentence = sentences_1[_a];
                    if (sentence.trim().length === 0)
                        return [3 /*break*/, 7];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 250); })];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, channel.send(sentence)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 4];
                case 8: return [3 /*break*/, 12];
                case 9:
                    if (line.trim().length === 0)
                        return [3 /*break*/, 12];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 250); })];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, channel.send(line)];
                case 11:
                    _b.sent();
                    _b.label = 12;
                case 12:
                    _i++;
                    return [3 /*break*/, 3];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Replace all mentions in a message with <@nickname> or <@nickname (YOU)>
function replaceMentions(msgContent, client) {
    var result = msgContent;
    var matches = msgContent.matchAll(/<@!?([0-9]+)>/g);
    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
        var match = matches_1[_i];
        var id = match[1];
        var user = client.users.cache.get(id);
        if (user) {
            if (user.id === client.user.id) {
                result = result.replace(match[0], "<@".concat(client.user.displayName, " (YOU)>"));
                console.log("Replacing mention ".concat(match[0], " with <@").concat(client.user.displayName, " (YOU)>"));
            }
            else {
                result = result.replace(match[0], "<@".concat(user.displayName, ">"));
                console.log("Replacing mention ".concat(match[0], " with ").concat(user.displayName));
            }
        }
    }
    return result;
}
function timeElapsedString(timestamp) {
    var timeElapsed = Date.now() - timestamp;
    timeElapsed = Math.floor(timeElapsed / 1000);
    if (timeElapsed < 60) {
        return "".concat(timeElapsed, " seconds ago");
    }
    timeElapsed = Math.floor(timeElapsed / 60);
    if (timeElapsed < 60) {
        if (timeElapsed === 1) {
            return '1 minute ago';
        }
        else {
            return "".concat(timeElapsed, " minutes ago");
        }
    }
    timeElapsed = Math.floor(timeElapsed / 60);
    if (timeElapsed < 24) {
        if (timeElapsed === 1) {
            return '1 hour ago';
        }
        else {
            return "".concat(timeElapsed, " hours ago");
        }
    }
    timeElapsed = Math.floor(timeElapsed / 24);
    if (timeElapsed === 1) {
        return '1 day ago';
    }
    else {
        return "".concat(timeElapsed, " days ago");
    }
}
client.login(process.env.BOT_TOKEN);
