import { PrismaClient, Gender, Rank, PlayerStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.matchPlayer.deleteMany();
  await prisma.match.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.player.deleteMany();
  await prisma.court.deleteMany();

  // Create courts
  const courts = await Promise.all([
    prisma.court.create({ data: { name: 'Court 1' } }),
    prisma.court.create({ data: { name: 'Court 2' } }),
    prisma.court.create({ data: { name: 'Court 3' } }),
  ]);
  console.log(`Created ${courts.length} courts`);

  // Create players
  const playerData = [
    { name: 'Alex Chen', gender: 'Male' as Gender, rank: 'A' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
    { name: 'Brian Lee', gender: 'Male' as Gender, rank: 'B' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
    { name: 'Carlos Wong', gender: 'Male' as Gender, rank: 'C' as Rank, preferredCategories: ['MensDoubles'] },
    { name: 'David Kim', gender: 'Male' as Gender, rank: 'B' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
    { name: 'Edward Park', gender: 'Male' as Gender, rank: 'D' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
    { name: 'Frank Tan', gender: 'Male' as Gender, rank: 'C' as Rank, preferredCategories: ['MensDoubles'] },
    { name: 'George Wu', gender: 'Male' as Gender, rank: 'A' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
    { name: 'Henry Zhang', gender: 'Male' as Gender, rank: 'E' as Rank, preferredCategories: ['MensDoubles'] },
    { name: 'Grace Liu', gender: 'Female' as Gender, rank: 'A' as Rank, preferredCategories: ['WomensDoubles', 'MixedDoubles'] },
    { name: 'Helen Ng', gender: 'Female' as Gender, rank: 'B' as Rank, preferredCategories: ['WomensDoubles', 'MixedDoubles'] },
    { name: 'Iris Wu', gender: 'Female' as Gender, rank: 'C' as Rank, preferredCategories: ['WomensDoubles', 'MixedDoubles'] },
    { name: 'Julia Chan', gender: 'Female' as Gender, rank: 'B' as Rank, preferredCategories: ['WomensDoubles'] },
    { name: 'Karen Lim', gender: 'Female' as Gender, rank: 'D' as Rank, preferredCategories: ['WomensDoubles', 'MixedDoubles'] },
    { name: 'Linda Ho', gender: 'Female' as Gender, rank: 'C' as Rank, preferredCategories: ['WomensDoubles', 'MixedDoubles'] },
    { name: 'Kevin Zhang', gender: 'Male' as Gender, rank: 'A' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
    { name: 'Michael Tan', gender: 'Male' as Gender, rank: 'D' as Rank, preferredCategories: ['MensDoubles', 'MixedDoubles'] },
  ];

  const players = await Promise.all(
    playerData.map((p, i) =>
      prisma.player.create({
        data: {
          ...p,
          preferredCategories: p.preferredCategories,
          gamesPlayed: Math.floor(Math.random() * 20),
          totalWins: Math.floor(Math.random() * 10),
          status: 'Offline' as PlayerStatus,
          active: true,
        },
      })
    )
  );
  console.log(`Created ${players.length} players`);

  // Queue a few players
  const toQueue = players.slice(0, 8);
  for (let i = 0; i < toQueue.length; i++) {
    const player = toQueue[i];
    await prisma.player.update({
      where: { id: player.id },
      data: {
        status: 'Queued',
        checkInTime: new Date(),
        waitingStartTime: new Date(Date.now() - (8 - i) * 5 * 60 * 1000),
        queueEntry: {
          create: {
            position: i + 1,
            queuedAt: new Date(Date.now() - (8 - i) * 5 * 60 * 1000),
          },
        },
      },
    });
  }
  console.log(`Queued ${toQueue.length} players`);

  // Create a sample completed match
  const completedMatch = await prisma.match.create({
    data: {
      courtId: courts[0].id,
      category: 'MensDoubles',
      status: 'Completed',
      winningTeam: 1,
      startTime: new Date(Date.now() - 60 * 60 * 1000),
      endTime: new Date(Date.now() - 30 * 60 * 1000),
      players: {
        create: [
          { playerId: players[8].id, team: 1 },
          { playerId: players[9].id, team: 1 },
          { playerId: players[10].id, team: 2 },
          { playerId: players[11].id, team: 2 },
        ],
      },
    },
  });
  console.log('Created sample match history');

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
