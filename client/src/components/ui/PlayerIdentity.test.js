import React from 'react';
import { render, screen } from '@testing-library/react';
import RankBadge from './RankBadge';
import PlayerIdentity from './PlayerIdentity';

const NOVA_RANK = {
  id: 'nova',
  displayName: 'Nova',
  shortLabel: 'NOV',
  level: 3,
  iconKey: 'nova',
  colors: {
    bg: 'rgba(111, 78, 213, 0.24)',
    accent: '#bea9ff',
    text: '#f7f2ff',
    border: 'rgba(190, 169, 255, 0.45)',
  },
  progressToNext: 0.55,
  nextRankName: 'Astral',
  isTopRank: false,
};

describe('PlayerIdentity and RankBadge', () => {
  test('renders icon, rank label, and visible non-color cue', () => {
    const { container } = render(<RankBadge playerRank={NOVA_RANK} showProgress />);

    expect(screen.getByText(/Nova/i)).toBeTruthy();
    expect(screen.getByText(/NOV • L3/i)).toBeTruthy();
    expect(container.querySelector('.rank-badge__icon--nova')).toBeTruthy();
    expect(container.querySelector('.rank-badge__progress-fill')).toBeTruthy();
  });

  test('falls back safely when rank dto is missing', () => {
    render(<PlayerIdentity displayName="GuestPilot" playerRank={null} />);

    expect(screen.getByText('Unranked')).toBeTruthy();
    expect(screen.getByLabelText(/GuestPilot, Unranked rank/i)).toBeTruthy();
  });

  test('supports long names with accessible title and cpu label', () => {
    render(
      <PlayerIdentity
        displayName="AReallyLongPilotNameForMobileLayouts"
        playerRank={NOVA_RANK}
        isBot
        meta="Ready"
      />,
    );

    expect(screen.getByTitle('AReallyLongPilotNameForMobileLayouts')).toBeTruthy();
    expect(screen.getByText(/CPU • Ready/i)).toBeTruthy();
    expect(screen.getByLabelText(/AReallyLongPilotNameForMobileLayouts, Nova rank, CPU player, Ready/i)).toBeTruthy();
  });

  test('top rank badge omits progress when not requested', () => {
    const { container } = render(
      <RankBadge
        playerRank={{
          ...NOVA_RANK,
          displayName: 'Astral',
          shortLabel: 'AST',
          iconKey: 'astral',
          progressToNext: null,
          nextRankName: null,
          isTopRank: true,
        }}
      />,
    );

    expect(screen.getByText(/Astral/i)).toBeTruthy();
    expect(container.querySelector('.rank-badge__progress-fill')).toBeNull();
  });
});
