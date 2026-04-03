import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { handleInteraction } from './handlers/interactionCreate.js';
import * as games from './commands/games.js';
import * as spin from './commands/spin.js';
import * as vote from './commands/vote.js';
import * as close from './commands/close.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
for (const mod of [games, spin, vote, close]) {
  client.commands.set(mod.data.name, mod);
}

client.on('interactionCreate', interaction => handleInteraction(interaction, client));

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
