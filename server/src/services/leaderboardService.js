'use strict';

const { getPrismaClient } = require('../db/client');

async function ensureUser(prisma, userId, displayName) {
  return prisma.user.upsert({
    where: { id: userId },
    update: { displayName },
    create: { id: userId, displayName },
  });
}

async function updateLeaderboardFromMatch(match) {
  if (!match.settings.ranked || match.status !== 'completed' || !match.completedByServer) {
    return;
  }

  const prisma = getPrismaClient();
  if (!prisma) return;

  const participants = [...match.players.values()].filter((player) => !player.isBot);
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  const winnerId = sorted[0]?.id || null;

  for (const player of participants) {
    await ensureUser(prisma, player.id, player.displayName);
    const existing = await prisma.leaderboardStat.findUnique({ where: { userId: player.id } });
    const wins = existing?.wins || 0;
    const losses = existing?.losses || 0;
    const totalMatches = wins + losses;
    const didWin = winnerId === player.id;
    const nextWins = wins + (didWin ? 1 : 0);
    const nextLosses = losses + (didWin ? 0 : 1);

    const reaction = Number.isFinite(player.fastestBreakMs) ? player.fastestBreakMs : null;

    await prisma.leaderboardStat.upsert({
      where: { userId: player.id },
      create: {
        userId: player.id,
        rating: 1000 + (didWin ? 20 : -10),
        wins: didWin ? 1 : 0,
        losses: didWin ? 0 : 1,
        bestScore: player.score,
        bestCombo: player.bestCombo,
        bestStreak: player.bestStreak,
        fastestValidBreakMs: reaction,
      },
      update: {
        rating: (existing?.rating || 1000) + (didWin ? 20 : -10),
        wins: nextWins,
        losses: nextLosses,
        bestScore: Math.max(existing?.bestScore || 0, player.score),
        bestCombo: Math.max(existing?.bestCombo || 0, player.bestCombo),
        bestStreak: Math.max(existing?.bestStreak || 0, player.bestStreak),
        fastestValidBreakMs:
          reaction == null
            ? existing?.fastestValidBreakMs || null
            : Math.min(existing?.fastestValidBreakMs || Number.MAX_SAFE_INTEGER, reaction),
        winRate: totalMatches >= 0 ? Number((nextWins / Math.max(1, nextWins + nextLosses)).toFixed(4)) : 0,
      },
    });
  }

  await prisma.matchRecord.create({
    data: {
      id: match.id,
      code: match.code,
      ranked: match.settings.ranked,
      mode: match.mode,
      winnerUserId: winnerId,
      completedAt: new Date(),
      payload: JSON.stringify({
        settings: match.settings,
        suspiciousFlags: match.suspiciousFlags,
      }),
      participants: {
        create: sorted.map((player, index) => ({
          userId: player.id,
          displayName: player.displayName,
          score: player.score,
          combo: player.bestCombo,
          streak: player.bestStreak,
          position: index + 1,
        })),
      },
      replayEvents: {
        create: match.replay.map((event) => ({
          type: event.type,
          payload: JSON.stringify(event.payload || {}),
          createdAt: new Date(event.timestamp),
        })),
      },
    },
  });
}

async function getLeaderboard({ period = 'all-time', limit = 50 } = {}) {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  if (period === 'weekly') {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const rows = await prisma.matchParticipant.groupBy({
      by: ['userId', 'displayName'],
      where: {
        createdAt: { gte: weekStart },
        match: { ranked: true },
      },
      _sum: { score: true },
      _count: { _all: true },
      orderBy: { _sum: { score: 'desc' } },
      take: limit,
    });

    return rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.userId,
      displayName: row.displayName,
      weeklyScore: row._sum.score || 0,
      matches: row._count._all,
    }));
  }

  const stats = await prisma.leaderboardStat.findMany({
    take: limit,
    orderBy: [{ rating: 'desc' }, { wins: 'desc' }],
    include: { user: true },
  });

  return stats.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    displayName: row.user?.displayName || row.userId,
    rating: row.rating,
    wins: row.wins,
    losses: row.losses,
    winRate: row.winRate,
    bestScore: row.bestScore,
    bestCombo: row.bestCombo,
    bestStreak: row.bestStreak,
    fastestValidBreakMs: row.fastestValidBreakMs,
  }));
}

async function getProfile(userId) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const [user, stat] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.leaderboardStat.findUnique({ where: { userId } }),
  ]);

  if (!user) return null;

  return {
    id: user.id,
    displayName: user.displayName,
    createdAt: user.createdAt,
    stats: stat || {
      rating: 1000,
      wins: 0,
      losses: 0,
      winRate: 0,
      bestScore: 0,
      bestCombo: 0,
      bestStreak: 0,
      fastestValidBreakMs: null,
    },
  };
}

module.exports = {
  updateLeaderboardFromMatch,
  getLeaderboard,
  getProfile,
};
