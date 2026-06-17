'use strict';

const mockPrisma = {
  user: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  leaderboardStat: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  matchParticipant: {
    groupBy: jest.fn(),
  },
  matchRecord: {
    create: jest.fn(),
  },
};

jest.mock('../src/db/client', () => ({
  getPrismaClient: () => mockPrisma,
}));

const { BASE_RATING } = require('../src/domain/rankDomain');
const { updateLeaderboardFromMatch, getLeaderboard, getProfile } = require('../src/services/leaderboardService');

describe('leaderboard service', () => {
  beforeEach(() => {
    mockPrisma.user.upsert.mockReset().mockResolvedValue({});
    mockPrisma.user.findUnique.mockReset().mockResolvedValue(null);
    mockPrisma.leaderboardStat.findUnique.mockReset().mockResolvedValue(null);
    mockPrisma.leaderboardStat.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.leaderboardStat.upsert.mockReset().mockResolvedValue({});
    mockPrisma.matchParticipant.groupBy.mockReset().mockResolvedValue([]);
    mockPrisma.matchRecord.create.mockReset().mockResolvedValue({});
  });

  test('server-completed ranked matches with CPU players update leaderboard stats and records', async () => {
    const match = {
      id: 'm-ranked',
      code: 'ABC123',
      status: 'completed',
      completedByServer: true,
      mode: 'ranked',
      settings: { ranked: true },
      suspiciousFlags: [],
      replay: [],
      players: new Map([
        ['human-1', {
          id: 'human-1',
          displayName: 'PlayerOne',
          isBot: false,
          score: 120,
          bestCombo: 3,
          bestStreak: 4,
          fastestBreakMs: 900,
        }],
        ['cpu-novarider27', {
          id: 'cpu-novarider27',
          displayName: 'NovaRider27',
          isBot: true,
          score: 110,
          bestCombo: 2,
          bestStreak: 3,
          fastestBreakMs: 1200,
        }],
      ]),
    };

    await updateLeaderboardFromMatch(match);

    expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'cpu-novarider27' },
      create: expect.objectContaining({ isBot: true }),
      update: expect.objectContaining({ isBot: true }),
    }));
    expect(mockPrisma.leaderboardStat.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.matchRecord.create).toHaveBeenCalledTimes(1);

    const participantRows = mockPrisma.matchRecord.create.mock.calls[0][0].data.participants.create;
    expect(participantRows).toHaveLength(2);
    expect(participantRows.find((row) => row.userId === 'cpu-novarider27')?.isBot).toBe(true);
  });

  test('abandoned matches do not update ranked leaderboard', async () => {
    const match = {
      id: 'm-abandoned',
      code: 'ABD111',
      status: 'abandoned',
      completedByServer: false,
      mode: 'ranked',
      settings: { ranked: true },
      suspiciousFlags: [],
      replay: [],
      players: new Map([
        ['human-1', {
          id: 'human-1',
          displayName: 'PlayerOne',
          isBot: false,
          score: 80,
          bestCombo: 2,
          bestStreak: 2,
          fastestBreakMs: 950,
        }],
      ]),
    };

    await updateLeaderboardFromMatch(match);

    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.leaderboardStat.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.matchRecord.create).not.toHaveBeenCalled();
  });

  test('casual matches with CPU players do not update ranked leaderboard standings', async () => {
    const match = {
      code: 'XYZ999',
      status: 'completed',
      completedByServer: true,
      mode: 'casual',
      settings: { ranked: false },
      suspiciousFlags: [],
      replay: [],
      players: new Map([
        ['human-1', {
          id: 'human-1',
          displayName: 'PlayerOne',
          isBot: false,
          score: 40,
          bestCombo: 1,
          bestStreak: 2,
          fastestBreakMs: 1000,
        }],
        ['cpu-kaiorbit', {
          id: 'cpu-kaiorbit',
          displayName: 'KaiOrbit',
          isBot: true,
          score: 30,
          bestCombo: 1,
          bestStreak: 1,
          fastestBreakMs: 1300,
        }],
      ]),
    };

    await updateLeaderboardFromMatch(match);

    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.leaderboardStat.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.matchRecord.create).not.toHaveBeenCalled();
  });

  test('all-time leaderboard entries include server-computed rank dto', async () => {
    mockPrisma.leaderboardStat.findMany.mockResolvedValue([
      {
        userId: 'human-1',
        rating: 1220,
        wins: 9,
        losses: 2,
        winRate: 0.8182,
        bestScore: 440,
        bestCombo: 4,
        bestStreak: 7,
        fastestValidBreakMs: 812,
        user: { displayName: 'PlayerOne', isBot: false },
      },
    ]);

    const rows = await getLeaderboard({ period: 'all-time' });

    expect(rows[0].playerRank).toEqual(expect.objectContaining({
      displayName: 'Nova',
      shortLabel: 'NOV',
      nextRankName: 'Astral',
    }));
  });

  test('weekly leaderboard entries include server-computed rank dto from trusted stats', async () => {
    mockPrisma.matchParticipant.groupBy.mockResolvedValue([
      {
        userId: 'human-1',
        displayName: 'PlayerOne',
        _sum: { score: 540 },
        _count: { _all: 4 },
      },
    ]);
    mockPrisma.leaderboardStat.findMany.mockResolvedValue([
      {
        userId: 'human-1',
        rating: 1450,
        wins: 10,
        losses: 2,
      },
    ]);

    const rows = await getLeaderboard({ period: 'weekly' });

    expect(rows[0].playerRank).toEqual(expect.objectContaining({
      displayName: 'Astral',
      isTopRank: true,
    }));
  });

  test('profile response includes rank dto and safe fallback for malformed stats', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'human-1',
      displayName: 'PlayerOne',
      isBot: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });
    mockPrisma.leaderboardStat.findUnique.mockResolvedValue({
      userId: 'human-1',
      rating: null,
      wins: 'bad',
      losses: -4,
      winRate: 0,
      bestScore: 0,
      bestCombo: 0,
      bestStreak: 0,
      fastestValidBreakMs: null,
    });

    const profile = await getProfile('human-1');

    expect(profile.playerRank).toEqual(expect.objectContaining({
      rating: BASE_RATING,
      displayName: 'Lumen',
    }));
  });

  test('profile fallback rank still resolves for players without persisted stats', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'cpu-scout',
      displayName: 'Scout',
      isBot: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });
    mockPrisma.leaderboardStat.findUnique.mockResolvedValue(null);

    const profile = await getProfile('cpu-scout');

    expect(profile.playerRank).toEqual(expect.objectContaining({
      displayName: 'Lumen',
      rating: BASE_RATING,
    }));
  });
});
