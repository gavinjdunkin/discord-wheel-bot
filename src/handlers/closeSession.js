import { EmbedBuilder } from 'discord.js';
import { sessions, weightedRandom } from '../data/store.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildBar(tickets, maxTickets, barWidth = 12) {
  const filled = Math.round((tickets / maxTickets) * barWidth);
  return '█'.repeat(filled) + '░'.repeat(barWidth - filled);
}

function spinningEmbed(gameName) {
  return new EmbedBuilder()
    .setTitle('🎰 Spinning...')
    .setDescription(`## ${gameName}`)
    .setColor(0xEB459E);
}

function resultEmbed(winner, ticketsMap, session) {
  const sorted = [...ticketsMap.entries()]
    .sort(([, a], [, b]) => b - a);

  const maxTickets = sorted[0]?.[1] ?? 1;

  const breakdown = sorted.map(([id, tickets]) => {
    const game = session.games.find(g => g.id === id);
    const bar = buildBar(tickets, maxTickets);
    return `${bar} **${game.name}** — ${tickets} ticket${tickets !== 1 ? 's' : ''}`;
  }).join('\n');

  return new EmbedBuilder()
    .setTitle('The wheel has spoken.')
    .setDescription(`# 🎉 ${winner.name}`)
    .addFields(
      { name: 'Ticket breakdown', value: breakdown },
      { name: 'Total voters', value: String(session.votes.size), inline: true },
    )
    .setColor(0xFFD700)
    .setFooter({ text: 'Good luck, have fun.' });
}

export async function closeSession(guildId, client) {
  const session = sessions.get(guildId);
  if (!session) return;

  session.closed = true;
  sessions.delete(guildId);

  // Tally Borda count
  const tickets = new Map(session.games.map(g => [g.id, 0]));
  for (const vote of session.votes.values()) {
    tickets.set(vote.first, tickets.get(vote.first) + 3);
    if (vote.second) tickets.set(vote.second, tickets.get(vote.second) + 2);
    if (vote.third)  tickets.set(vote.third,  tickets.get(vote.third)  + 1);
  }

  // Only keep games that received at least one vote
  const votedTickets = new Map([...tickets.entries()].filter(([, v]) => v > 0));

  // Fetch the channel
  const channel = await client.channels.fetch(session.channelId).catch(() => null);
  if (!channel) return;

  // Disable the original voting message
  try {
    const votingMsg = await channel.messages.fetch(session.messageId);
    await votingMsg.edit({
      embeds: [
        votingMsg.embeds[0]
          ? EmbedBuilder.from(votingMsg.embeds[0]).setTitle('🔒 Voting is closed.').setColor(0x95A5A6)
          : new EmbedBuilder().setTitle('🔒 Voting is closed.').setColor(0x95A5A6)
      ],
    });
  } catch {
    // Message may have been deleted — continue anyway
  }

  // Handle the edge case: nobody voted
  if (votedTickets.size === 0) {
    await channel.send({ content: 'No votes were cast — the wheel has nothing to spin!' });
    return;
  }

  const winnerId = weightedRandom(votedTickets);
  const winner = session.games.find(g => g.id === winnerId);

  // Animated spin — slot machine effect
  const spinMsg = await channel.send({ embeds: [spinningEmbed('...')] });

  // Phase 1: fast (10 frames × 120ms)
  for (let i = 0; i < 10; i++) {
    await spinMsg.edit({ embeds: [spinningEmbed(randomPick(session.games).name)] });
    await sleep(120);
  }

  // Phase 2: slowing down
  for (const delay of [200, 250, 300, 350, 400, 450]) {
    await spinMsg.edit({ embeds: [spinningEmbed(randomPick(session.games).name)] });
    await sleep(delay);
  }

  // Final reveal
  await spinMsg.edit({ embeds: [resultEmbed(winner, votedTickets, session)] });
}
