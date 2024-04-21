import { Message } from "discord.js";
import { ActionBot } from "./src/action-bot";
import { ClaudeAI } from "./src/models/claudeai";

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

const { generateText } = require('./src/models/claudeai');
const { generateTextGpt, generateTextGenericGpt } = require('./gptwrapper');
const { addMessageToConversation } = require("./src/conversation");


require('dotenv').config({ path: __dirname + '/.env' });

async function generateAssistantResponse(prompt: string, conversationId) {
  try {
    const response = await generateText(prompt, conversationId);
    return response.assistantMessage;
  } catch (error) {
    console.error('Error in generateAssistantResponse:', error);
    throw error;
  }
}

async function generateResponseGPT3(prompt) {
  try {
    const response = await generateTextGenericGpt(prompt, "gpt-3.5-turbo");
    return response;
  } catch (error) {
    console.error('Error in generateResponseGPT3:', error);
    throw error;
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.commands = new Map();
client.commands.set('setmodel', require('./src/commands/setmodel/setmodel-cmd'));
client.commands.set('aggregate', require('./src/commands/aggregate/aggregate-cmd'));
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands?.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.on('messageCreate', async (msg: Message<boolean>) => {
  // Do not respond to messages sent by the bot itself
  if (msg.author.id === client.user.id) return;

  try {
    const bot: ActionBot = new ActionBot(client, new ClaudeAI(), new ClaudeAI());
    bot.onMessageReceived(msg);
  } 
  catch (error) {
    console.error("Error in client.on('messageCreate'):", error);
  }
});

/** 
 * Given a message object, returns the message content formatted as
 * "(#channel, $$$timestamp$$$) [username] content".
 * If includeChannel is false, the result will be formatted as
 * "($$$timestamp$$$) [username] content".
 */
function formatMessage(msg: any, includeChannel: boolean = true) {
  const channelName = msg.channel.type === ChannelType.DM ? 'Direct Message' : `#${msg.channel.name}`;
  const time = msg.createdTimestamp;
  let msgText = msg.content;
  msgText = replaceMentions(msgText, client);
  if (includeChannel) {
    return `(${channelName}, $$$${time}$$$) [${msg.author.displayName}] ${msgText}`;
  } else {
    return `($$$${time}$$$) [${msg.author.displayName}] ${msgText}`;
  }
}

// an async function that will break up a message by line breaks and send each line as a separate message, waiting briefly between each one.
// also breaks up by sentences (. or ? or !), only if the combined sentence is longer than 40 characters.
// never breaks up a message that is longer than 300 characters in total.
// never breaks up a message containing ``` (code blocks).
async function sendMultiLineMessage(channel, message: string) {
  if (message.includes('```') || message.length > 300) {
    await channel.send(message);
    return;
  }
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.length > 40) {
      const sentences = line.split(/(?<=[.?!])\s+(?=[a-z])/);
      for (const sentence of sentences) {
        if (sentence.trim().length === 0) continue;
        await new Promise(resolve => setTimeout(resolve, 250));
        await channel.send(sentence);
      }
      continue;
    }

    if (line.trim().length === 0) continue;
    await new Promise(resolve => setTimeout(resolve, 250));
    await channel.send(line);
  }
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

client.login(process.env.BOT_TOKEN);
