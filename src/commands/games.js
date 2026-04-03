import { SlashCommandBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { loadGames, saveGames } from '../data/store.js';
import { isAdmin } from '../utils/guards.js';

export const data = new SlashCommandBuilder()
  .setName('games')
  .setDescription('Manage the game list')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a game to the list')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Game name').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a game from the list')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Game name').setRequired(true).setAutocomplete(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Show all games')
  );

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const games = loadGames();
  const filtered = games
    .filter(g => g.name.toLowerCase().includes(focused))
    .slice(0, 25);
  await interaction.respond(filtered.map(g => ({ name: g.name, value: g.name })));
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    const games = loadGames();
    if (!games.length) {
      return interaction.reply({ content: 'No games added yet. Use `/games add` to get started.', ephemeral: true });
    }
    const list = games.map((g, i) => `${i + 1}. ${g.name}`).join('\n');
    return interaction.reply({ content: `**Games (${games.length})**\n${list}`, ephemeral: true });
  }

  if (!isAdmin(interaction)) {
    return interaction.reply({ content: 'You need admin permissions to manage games.', ephemeral: true });
  }

  if (sub === 'add') {
    const name = interaction.options.getString('name').trim();
    const games = loadGames();
    if (games.length >= 25) {
      return interaction.reply({ content: 'The game list is full (max 25). Remove a game first.', ephemeral: true });
    }
    if (games.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      return interaction.reply({ content: `**${name}** is already on the list.`, ephemeral: true });
    }
    games.push({ id: uuidv4(), name });
    saveGames(games);
    return interaction.reply({ content: `Added **${name}** to the list.`, ephemeral: true });
  }

  if (sub === 'remove') {
    const name = interaction.options.getString('name').trim();
    const games = loadGames();
    const idx = games.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) {
      return interaction.reply({ content: `Couldn't find **${name}** on the list.`, ephemeral: true });
    }
    games.splice(idx, 1);
    saveGames(games);
    return interaction.reply({ content: `Removed **${name}** from the list.`, ephemeral: true });
  }
}
