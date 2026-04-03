import { SlashCommandBuilder } from 'discord.js';
import { sessions } from '../data/store.js';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Cast your ranked vote for which game to play')
  .addStringOption(opt =>
    opt.setName('first').setDescription('Your top pick').setRequired(true).setAutocomplete(true)
  )
  .addStringOption(opt =>
    opt.setName('second').setDescription('Your second pick').setRequired(false).setAutocomplete(true)
  )
  .addStringOption(opt =>
    opt.setName('third').setDescription('Your third pick').setRequired(false).setAutocomplete(true)
  );

export async function autocomplete(interaction) {
  const session = sessions.get(interaction.guildId);
  if (!session || session.closed) {
    return interaction.respond([]);
  }

  const focused = interaction.options.getFocused(true);
  const focusedValue = focused.value.toLowerCase();

  // Collect already-selected values from the other two options
  const allNames = ['first', 'second', 'third'];
  const otherSelected = allNames
    .filter(name => name !== focused.name)
    .map(name => interaction.options.getString(name))
    .filter(Boolean)
    .map(v => v.toLowerCase());

  const choices = session.games
    .filter(g => !otherSelected.includes(g.name.toLowerCase()))
    .filter(g => g.name.toLowerCase().includes(focusedValue))
    .slice(0, 25);

  await interaction.respond(choices.map(g => ({ name: g.name, value: g.name })));
}

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const session = sessions.get(guildId);

  if (!session || session.closed) {
    return interaction.reply({ content: 'No voting session is active right now.', ephemeral: true });
  }

  const firstName = interaction.options.getString('first');
  const secondName = interaction.options.getString('second');
  const thirdName = interaction.options.getString('third');

  // Resolve names to game IDs from the session snapshot
  const resolve = name => session.games.find(g => g.name.toLowerCase() === name?.toLowerCase());

  const first = resolve(firstName);
  if (!first) {
    return interaction.reply({ content: `Couldn't find **${firstName}** in the game list.`, ephemeral: true });
  }

  const second = secondName ? resolve(secondName) : null;
  if (secondName && !second) {
    return interaction.reply({ content: `Couldn't find **${secondName}** in the game list.`, ephemeral: true });
  }

  const third = thirdName ? resolve(thirdName) : null;
  if (thirdName && !third) {
    return interaction.reply({ content: `Couldn't find **${thirdName}** in the game list.`, ephemeral: true });
  }

  // Validate no duplicates
  const picks = [first?.id, second?.id, third?.id].filter(Boolean);
  if (new Set(picks).size !== picks.length) {
    return interaction.reply({ content: "You can't pick the same game more than once.", ephemeral: true });
  }

  const isUpdate = session.votes.has(interaction.user.id);
  session.votes.set(interaction.user.id, {
    first: first.id,
    second: second?.id ?? null,
    third: third?.id ?? null,
  });

  const summary = [
    `1st: **${first.name}**`,
    second ? `2nd: **${second.name}**` : null,
    third ? `3rd: **${third.name}**` : null,
  ].filter(Boolean).join('  |  ');

  await interaction.reply({
    content: `${isUpdate ? 'Vote updated!' : 'Vote recorded!'}  ${summary}`,
    ephemeral: true,
  });
}
