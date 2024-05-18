import { Message } from "discord.js";
import { ActionBot } from "./src/action-bot";
import { ClaudeAI } from "./src/models/claudeai";
import { OpenAiGpt } from "./src/models/openai";

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
const bot: ActionBot = new ActionBot(client, new OpenAiGpt(), new OpenAiGpt());

require('dotenv').config({ path: __dirname + '/.env' });

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
    bot.onMessageReceived(msg);
  } 
  catch (error) {
    console.error("Error in client.on('messageCreate'):", error);
  }
});

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

client.login(process.env.BOT_TOKEN);
