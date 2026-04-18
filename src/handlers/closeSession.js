import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { sessions, weightedRandom } from '../data/store.js';
import { generateWheelGif, GIF_DURATION_MS } from '../utils/wheelGif.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));


function buildBar(tickets, maxTickets, barWidth = 12) {
  const filled = Math.round((tickets / maxTickets) * barWidth);
  return '█'.repeat(filled) + '░'.repeat(barWidth - filled);
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

  const gifBuffer = generateWheelGif(votedTickets, session.games, winnerId);

  // Post the GIF with a blank placeholder — results hidden until the spin finishes
  const attachment = new AttachmentBuilder(gifBuffer, { name: 'wheel.gif' });
  const msg = await channel.send({
    files: [attachment],
    embeds: [
      new EmbedBuilder()
        .setTitle('🎰 Spinning...')
        .setImage('attachment://wheel.gif')
        .setColor(0xEB459E),
    ],
  });

  // Wait for the GIF to finish, then reveal results
  await sleep(GIF_DURATION_MS);
  await msg.edit({
    embeds: [resultEmbed(winner, votedTickets, session).setImage('attachment://wheel.gif')],
  });
}
