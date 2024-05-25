// action-bot.ts

import { ChannelType, GuildBasedChannel, Message, TextBasedChannel } from 'discord.js';
import { BotAction, DirectMessageAction, ChannelMessageAction, WikipediaAction, HttpGetAction } from './actions';
import { CustomClient } from './custom-client';
import { Model } from './models/model';
import { addUserMessageToConversation, addMessageToConversation, BotMessage } from './conversation';

const CHANNEL_MAP = new Map<string, string>([
    ["commons", "1172266862000738435"],
    ["generations", "1101197966544486442"],
    ["alt-experiments", "1101310323371294781"],
    ["notebook", "1138958313011302530"],
]);

const SYSTEM_LENGTH_WARNING = "This message was very long. Aim for no more than 8 lines"
const LOG_TAG = "[ActionBot]";

/**
 * An action that ends the bot's turn.
 */
export class PassAction extends BotAction {
    constructor() {
        super("[PASS]", "do nothing.");
    }
    matches(message: string): boolean {
        return message.toLowerCase().startsWith('[pass]');
    }
    async execute(_message: string): Promise<string> {
        return null;
    }
}

/**
 * A bot that chooses one or more actions to perform based on a message.
 * 
 * @param client The Discord client.
 * @param model The model to use for generating responses.
 * @param botId The ID used to track the bot's conversation history.
 * @param personalityMsg The message describing the bot's personality.
 * @param actions The actions available to the bot.
 */
export class ActionBot {
    readonly client: CustomClient;
    readonly model: Model;
    readonly botId: string;
    readonly personalityMsg: string;
    readonly actions: BotAction[];

    constructor(client: CustomClient, model: Model, personalityMsg: string) {
        this.client = client;
        this.model = model;
        this.botId = process.env.CONVERSATION_ID;
        this.personalityMsg = personalityMsg;
        this.actions = [
            new PassAction(),
            new DirectMessageAction(client),
            new ChannelMessageAction(client),
            new WikipediaAction(),
            new HttpGetAction()
        ];
    }

    /** The number of messages (including internal messages) received by the bot. */
    messagesHandled: number = 0;

    async onMessageReceived(msg: Message): Promise<void> {
        const client = this.client;

        if (msg.author.id === client.user.id) return;
        if (!msg.channel.isTextBased()) {
            import('chalk').then(chalk => {
                console.log(`${chalk.default.gray(LOG_TAG)} Ignoring non-text-based channel`);
            });
            return;
        }

        let formattedMessage = formatMessage(msg, client);
        
        const { imageUrls, attachmentsSummary } = this.getAttachments(msg);
        formattedMessage += attachmentsSummary;

        const channel = msg.channel as TextBasedChannel;

        try {
            await this.handleMessage(channel, formattedMessage, imageUrls);
        } catch (error) {
            console.error('Error while handling message:', error);
        }
    }

    /**
     * Generates an action in response to the message and executes it.
     * Adds the response to the conversation history.
     * If preempted by a new message, the response to the original message is ignored.
     */
    async handleMessage(channel: TextBasedChannel, formattedMessage: string, imageUrls: string[] = []): Promise<void> {
        this.messagesHandled++;
        const messageNumber = this.messagesHandled;
        
        import('chalk').then(chalk => {
            console.log(`${chalk.default.gray(LOG_TAG)} ${chalk.default.cyan("RECEIVING #" + (messageNumber))}: ${chalk.default.rgb(180,180,180)(formattedMessage)}`);
        });

        await new Promise(resolve => setTimeout(resolve, 750));  // Wait before calling API in case of rapid messages

        if (messageNumber !== this.messagesHandled) {
            import('chalk').then(chalk => {
                console.log(`${chalk.default.gray(LOG_TAG)} Message ${messageNumber} was preempted by a new message before making API call.`);
            });
            return;
        }

        const modelResponse = await this.getBotResponse(channel, formattedMessage, imageUrls);

        if (messageNumber !== this.messagesHandled) {
            import('chalk').then(chalk => {
                console.log(`${chalk.default.gray(LOG_TAG)} Message ${messageNumber} was preempted by a new message. Discarding API response.`);
            });
            return;
        }

        import('chalk').then(chalk => {
            console.log(`${chalk.default.gray(LOG_TAG)} ${chalk.default.green("RESPONSE->#" + messageNumber)}: ${chalk.default.rgb(220,220,220)(modelResponse)}`);
        });

        if (!PassAction.prototype.matches(modelResponse)) {
            await addMessageToConversation(this.botId, modelResponse, "assistant",);
            let systemResponse = await this.executeAction(modelResponse);
            if (!systemResponse) {
                systemResponse = 
`Completed action. [PASS] if you're done, or take another action. 
(Don't immediately follow up in the same channel, unless you weren't finished.)`;
            }
            
            const systemResponseFormatted = this.formatInternalMessage(systemResponse);
            await addMessageToConversation(this.botId, systemResponseFormatted, "user");
            await this.handleMessage(channel, systemResponseFormatted);
        }
    }

    async getBotResponse(channel: TextBasedChannel, formattedMessage: string, imageUrls: string[] = []): Promise<string> {
        const client = this.client;

        // Format e.g. "[Current time: Saturday 3/14/2022, 12:00:00 PM pacific]"
        const timeOptions: Intl.DateTimeFormatOptions = { 
            weekday: 'long',
            year: 'numeric',
            month: 'numeric', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric', 
            second: 'numeric', 
            timeZoneName: 'short', 
            timeZone: 'America/Los_Angeles' };
        const timeString = `[Current time: ${new Date().toLocaleString('en-US', timeOptions)}]`;

        let channelList = (channel.type === ChannelType.DM) ? "" : (await generateChannelListMessage(channel.guild.id, client) + "\n\n");

        // Experimental:
        channelList = "List of available channels in the main server:\n";
        CHANNEL_MAP.forEach((channelId, channelName) => {
            channelList += `#${channelName} (${channelId})\n`;
        });

        const systemMessage = 
            timeString + "\n\n" +
            this.personalityMsg + "\n\n" +
            channelList + "\n\n" +
            (await generateUserDirectoryMessage(client)) + "\n\n" +
            this.generateActionListPrompt(this.actions);

        //console.log(`[ActionBot] Current system message: ${systemMessage}`)

        const { messageHistory, conversationId } = await addUserMessageToConversation(this.botId, formattedMessage, imageUrls);

        const messageHistoryFormatted = replaceTimestamps(messageHistory);

        const modelResponse = await this.model.generate(
            [...messageHistoryFormatted],
            systemMessage,
            0.11,
            512
        );

        return modelResponse;
    }

    async executeAction(message: string): Promise<string> {
        if (message) {
            try {
                const action = await this.getAction(message);
                if (action) {
                    return await action.execute(message);
                }
            } catch (error) {
                console.error('Error while executing action:', error);
                return "An error occurred while executing the action.";
            }
        }
        return "Invalid action or incorrect syntax.";
    }

    async getAction(message: string): Promise<BotAction> {
        if (message) {
            for (const action of this.actions) {
                if (action.matches(message)) {
                    return action;
                }
            }
        }

        return null;
    }

    /**
     * Returns the URLS of supported image attachments in a message, and
     * an addendum to the message describing all attachments.
     */
    getAttachments(msg: Message): { imageUrls: string[], attachmentsSummary: string } {
        let imageUrls: string[] = [];
        let imageNames: string[] = [];
        let unsupportedFileNames: string[] = [];

        if (!msg.attachments) {
            return { imageUrls, attachmentsSummary: "" };
        }

        msg.attachments.forEach((attachment) => {
            if (attachment.name.endsWith('.png') || attachment.name.endsWith('.jpg') || attachment.name.endsWith('.jpeg') || attachment.name.endsWith('.webp')) {
                imageUrls.push(attachment.url);
                imageNames.push(attachment.name);
            } else {
                unsupportedFileNames.push(attachment.name);
            }
        });

        let msgAddendum = "";
        if (imageNames.length > 0) {
            msgAddendum += "\n";
            msgAddendum += this.formatInternalMessage("Image(s) attached: " + imageNames.join(', '));
        }
        if (unsupportedFileNames.length > 0) {
            msgAddendum += "\n";
            msgAddendum += this.formatInternalMessage("Unsupported file(s) attached (which you can't view): " + unsupportedFileNames.join(', '));
        }

        return { imageUrls, attachmentsSummary: msgAddendum };
    }


    formatInternalMessage(message: string): string {
        return `[SYSTEM] ${message}`;
    }

    /**
     * Returns the ID of a channel from its name across all guilds the bot is in.
     * Assumes that the bot is only in one guild with a channel of the given name.
     * If the channel is not found, returns null.
     */
    async getChannelIdFromName(channelName: string): Promise<string> {
        for (const guild of this.client.guilds.cache.values()) {
            const channel = guild.channels.cache.find((channel) => channel.name === channelName);
            if (channel) {
                return channel.id;
            }
        }

        import('chalk').then(chalk => {
            console.error(`${chalk.default.gray(LOG_TAG)} Channel with name ${channelName} not found.`);
        });

        return null;
    }

    /**
     * Returns a prompt listing the actions that can be performed.
    */
    generateActionListPrompt(actions: BotAction[]): string {
        const ACTION_LIST_PROMPT = "Your response MUST begin with an action tag and MUST match one of the following action signatures:";
        const ACTION_LIST_SUFFIX = "You should [PASS] if they're not talking to you, the message isn't relevant to you, or you've finished what you were doing."
        return `${ACTION_LIST_PROMPT}\n${actions.map((action) => `"${action.signature}" - ${action.description}`).join('\n')}\n${ACTION_LIST_SUFFIX}`;
    }
}

/** 
 * Given a message object, returns the message content formatted as
 * "(#channel, $$$timestamp$$$) [username] content".
 * If includeChannel is false, the result will be formatted as
 * "($$$timestamp$$$) [username] content".
 */
function formatMessage(msg: Message, client: CustomClient, includeChannel: boolean = true) {
    const channelName = msg.channel.type === ChannelType.DM ? 'Direct Message' : `#${(msg.channel as GuildBasedChannel).name}`;
    const time = msg.createdTimestamp;
    let msgText = msg.content;
    msgText = replaceMentions(msgText, client);
    if (includeChannel) {
      return `(${channelName}, $$$${time}$$$) [${msg.author.displayName}] ${msgText}`;
    } else {
      return `($$$${time}$$$) [${msg.author.displayName}] ${msgText}`;
    }
  }

/**
 * Given a channel (DM or guild), generates a map of user IDs to their usernames and display names.
 */
async function getChannelMembers(channel: TextBasedChannel): Promise<Map<string, [string, string]>> {
    let memberMap: Map<string, [string, string]> = new Map<string, [string, string]>();
    if (channel.type === ChannelType.DM && channel.recipient && channel.recipient.id) {
        memberMap.set(channel.recipient.id, [channel.recipient.username, channel.recipient.displayName]);
    }
    else if (channel.type !== ChannelType.DM) {
        const guildChannel = channel as GuildBasedChannel;
        const members = await guildChannel.guild.members.fetch();
        members.forEach((member) => {
            memberMap.set(member.id, [member.user.username, member.displayName]);
        });
    }
    return memberMap;
}

/**
 * Generates the member directory message for users in every guild the bot is in.
 * Formatted as "<@user_id> (username="username", displaynames="displayname","displayname2"...);
 */
async function generateUserDirectoryMessage(client: CustomClient): Promise<string> {
    // id -> [username, list of display names]
    let userMap: Map<string, [string, string[]]> = new Map<string, [string, string[]]>();

    for (const channel of client.channels.cache.values()) {
        const channelMembers = await getChannelMembers(channel as TextBasedChannel);
    
        for (const [id, [username, displayName]] of channelMembers) {
            if (!userMap.has(id)) {
                userMap.set(id, [username, [displayName]]);
            }
            else {
                const displayNames = userMap.get(id)[1];
                if (!displayNames.includes(displayName)) {
                    displayNames.push(displayName);
                }
            }
        }
    }

    let memberList: string[] = [];
    userMap.forEach(([username, displayNames], id) => {
        memberList.push(`<@${id}> (username="${username}", displaynames="${displayNames.join('","')}")`);
    });

    return `Directory of users in all servers you know of:\n${memberList.join('\n')}`;
}

/**
 * Generate a message listing the channels in the guild and their IDs.
 */
async function generateChannelListMessage(guildId: string, client: CustomClient): Promise<string> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        return 'Guild not found.';
    }

    let channelList: string[] = [];
    guild.channels.cache.forEach((channel) => {
        channelList.push(`#${channel.name} (${channel.id})`);
    });

    return `Directory of channels in the server:\n${channelList.join('\n')}`;
}

/** 
 * Replace all mentions in a message with <@nickname> or <@nickname (YOU)> 
 */
function replaceMentions(msgContent: string, client: CustomClient): string {
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
      
  function timeElapsedString(timestamp: number): string {
    let timeElapsed = Date.now() - timestamp;

    if (timeElapsed < 2000) {
        return 'just now';
    }

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

    
// Replaces timestamps in the message history with a string representing the time elapsed since it was sent.
// Does not modify the original message history.
function replaceTimestamps(messageHistory: BotMessage[]): BotMessage[] {
    const newMessageHistory = JSON.parse(JSON.stringify(messageHistory));
    for (let i = 0; i < newMessageHistory.length; i++) {
        // timestamp is any number of digits between $$$. messages get combined so there may be multiple timestamps in one message
        const matches = newMessageHistory[i].content.matchAll(/\$\$\$([0-9]+)\$\$\$/g);
        let newContent = newMessageHistory[i].content;
        for (const match of matches) {
            const timestamp = parseInt(match[1]);
            newContent = newContent.replace(`$$$${timestamp}$$$`, timeElapsedString(timestamp));
        }
        newMessageHistory[i].content = newContent;
    }
    return newMessageHistory;
}
