'use strict';

const { getPrismaClient } = require('../db/client');
const { buildRankDto } = require('../domain/rankDomain');

async function getRanksForUsers(users = []) {
  const normalizedUsers = users
    .map((user) => ({
      userId: user?.userId || user?.id || null,
      stats: user?.stats || null,
    }))
    .filter((user) => user.userId);

  if (normalizedUsers.length === 0) return {};

  const prisma = getPrismaClient();
  const uniqueIds = [...new Set(normalizedUsers.map((user) => user.userId))];
  let persistedStatsByUserId = new Map();

  if (prisma?.leaderboardStat?.findMany) {
    const persistedStats = await prisma.leaderboardStat.findMany({
      where: { userId: { in: uniqueIds } },
    });
    persistedStatsByUserId = new Map(persistedStats.map((row) => [row.userId, row]));
  }

  return normalizedUsers.reduce((accumulator, user) => {
    const trustedStats = persistedStatsByUserId.get(user.userId) || user.stats || null;
    accumulator[user.userId] = buildRankDto(trustedStats || {});
    return accumulator;
  }, {});
}

module.exports = {
  getRanksForUsers,
  buildRankDto,
};
