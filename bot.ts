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
const { generateText, generateTextGeneric } = require('./gptwrapper');

require('dotenv').config({ path: __dirname + '/.env' });

async function generateAssistantResponse(prompt, conversationId) {
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
    const response = await generateTextGeneric(prompt, "gpt-3.5-turbo");
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
client.commands.set('setmodel', require('./commands/setmodel/setmodel-cmd'));
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

client.on('messageCreate', async msg => {
  // Do not respond to messages sent by the bot itself
  if (msg.author.id === client.user.id) return;

  console.log(`RECEIVED:"${msg.content}"`);

  const isMentioned = msg.mentions.has(client.user);

  // If this is a guild message not mentioning us, we prompt GPT-3.5 Turbo to ask if we should respond
  // based on the last 10 messages in the channel.
  let respondToNonMention = false;
  if (msg.guild && !isMentioned) {
    try {
      const channel = await msg.guild.channels.fetch(msg.channel.id);
      let last10Messages = await channel.messages.fetch({ limit: 10 });
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
      const response = await generateResponseGPT3(contextCheckPrompt);
      if (response.toLowerCase() === 'yes') {
        console.log(`Decided to respond to message "${msg.content}"`);
        respondToNonMention = true;
      }
      else {
        console.log(`Context check yielded response "${response}". Not responding to message.`);
      }
    } catch (error) {
      console.error("Error in client.on('messageCreate'):", error);
    }
  }

  if (msg.channel.type === ChannelType.DM || (msg.guild && isMentioned) || respondToNonMention) {
    try {
      let prompt = msg.content;
      prompt = replaceMentions(prompt, client);
      prompt = `[${msg.author.displayName}] ${prompt}`;
      console.log(`PROMPT:"${prompt}"`);

      await msg.channel.sendTyping();
      const response = await generateAssistantResponse(prompt, msg.author.id);
      await sendMultiLineMessage(msg.channel, response);
    } catch (error) {
      await msg.reply('⚠️ ERROR ERROR something broke ⚠️');
      console.error("Error in client.on('messageCreate'):", error);
    }
  }
});

// an async function that will break up a message by line breaks and send each line as a separate message, waiting briefly between each one.
// also breaks up by sentences (. or ? or !), only if the combined sentence is longer than 40 characters.
// never breaks up a message that is longer than 300 characters in total.
// never breaks up a message containing ``` (code blocks).
async function sendMultiLineMessage(channel, message) {
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
