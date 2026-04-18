import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { loadGames, sessions } from '../data/store.js';
import { isAdmin } from '../utils/guards.js';

export const data = new SlashCommandBuilder()
  .setName('spin')
  .setDescription('Open the voting window');

export async function execute(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: 'You need admin permissions to start a spin.', flags: MessageFlags.Ephemeral });
  }

  const guildId = interaction.guildId;
  if (sessions.has(guildId)) {
    return interaction.reply({ content: 'A voting session is already active. Use `/close` to end it.', flags: MessageFlags.Ephemeral });
  }

  const games = loadGames();
  if (games.length < 2) {
    return interaction.reply({ content: 'Add at least 2 games with `/games add` before spinning.', flags: MessageFlags.Ephemeral });
  }

  const gameList = games.map((g, i) => `${i + 1}. ${g.name}`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🎮 Voting is open!')
    .setDescription(`Use \`/vote\` to rank your picks.\n\n${gameList}`)
    .setColor(0x5865F2)
    .setFooter({ text: 'Vote with /vote first:<game> second:<game> third:<game> — 2nd and 3rd are optional.' });

  const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

  sessions.set(guildId, {
    guildId,
    channelId: interaction.channelId,
    messageId: msg.id,
    games: games.map(g => ({ ...g })),
    votes: new Map(),
    closed: false,
  });
}
