import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as games from './commands/games.js';
import * as spin from './commands/spin.js';
import * as vote from './commands/vote.js';
import * as close from './commands/close.js';

const commands = [games, spin, vote, close].map(mod => mod.data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const route = process.env.GUILD_ID
  ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(process.env.CLIENT_ID);

try {
  console.log('Registering slash commands...');
  await rest.put(route, { body: commands });
  console.log('Done.');
} catch (err) {
  console.error(err);
}
