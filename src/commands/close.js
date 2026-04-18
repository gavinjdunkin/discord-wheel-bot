import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { sessions } from '../data/store.js';
import { isAdmin } from '../utils/guards.js';
import { closeSession } from '../handlers/closeSession.js';

export const data = new SlashCommandBuilder()
  .setName('close')
  .setDescription('End voting and spin the wheel');

export async function execute(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: 'You need admin permissions to close a session.', flags: MessageFlags.Ephemeral });
  }

  const guildId = interaction.guildId;
  if (!sessions.has(guildId)) {
    return interaction.reply({ content: 'No active voting session. Start one with `/spin`.', flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({ content: 'Closing votes...', flags: MessageFlags.Ephemeral });
  await closeSession(guildId, interaction.client);
}
