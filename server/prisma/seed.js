'use strict';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: 'demo-player-1' },
    update: { displayName: 'DemoNova' },
    create: { id: 'demo-player-1', displayName: 'DemoNova' },
  });

  await prisma.user.upsert({
    where: { id: 'demo-player-2' },
    update: { displayName: 'DemoLumen' },
    create: { id: 'demo-player-2', displayName: 'DemoLumen' },
  });

  await prisma.leaderboardStat.upsert({
    where: { userId: 'demo-player-1' },
    update: {},
    create: {
      userId: 'demo-player-1',
      rating: 1040,
      wins: 5,
      losses: 3,
      winRate: 0.625,
      bestScore: 440,
      bestCombo: 4,
      bestStreak: 5,
      fastestValidBreakMs: 920,
    },
  });

  await prisma.leaderboardStat.upsert({
    where: { userId: 'demo-player-2' },
    update: {},
    create: {
      userId: 'demo-player-2',
      rating: 1005,
      wins: 4,
      losses: 4,
      winRate: 0.5,
      bestScore: 395,
      bestCombo: 3,
      bestStreak: 3,
      fastestValidBreakMs: 1140,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
