const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
    data: new SlashCommandBuilder()
      .setName('setmodel')
      .setDescription('Set which model is used by the bot.')
      .addStringOption(option =>
          option.setName('model')
              .setDescription('The model to use.')
        .setRequired(true)
        .addChoices(
          {name: 'strong', value: 'strong'},
          {name: 'fast', value: 'weak'},
          {name: 'standard', value: 'standard'},
        )),
    async execute(interaction) {
      if (interaction.user.id !== process.env.ADMIN_USERID) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
      }
      const model = interaction.options.getString('model');
      if (model === 'strong' || model === 'weak' || model === 'standard') {
        process.env.GPT_MODEL = model;
        await interaction.reply({ content: `Using model: ${model}`, ephemeral: true });
        console.log(`Using model: ${model}`);
      } else {
        await interaction.reply({ content: `Invalid model: ${model}`, ephemeral: true });
      }
    },
  };
  