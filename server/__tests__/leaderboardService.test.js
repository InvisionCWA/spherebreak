'use strict';

const mockPrisma = {
  user: {
    upsert: jest.fn(),
  },
  leaderboardStat: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  matchRecord: {
    create: jest.fn(),
  },
};

jest.mock('../src/db/client', () => ({
  getPrismaClient: () => mockPrisma,
}));

const { updateLeaderboardFromMatch } = require('../src/services/leaderboardService');

describe('leaderboard service', () => {
  beforeEach(() => {
    mockPrisma.user.upsert.mockReset().mockResolvedValue({});
    mockPrisma.leaderboardStat.findUnique.mockReset().mockResolvedValue(null);
    mockPrisma.leaderboardStat.upsert.mockReset().mockResolvedValue({});
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
});
