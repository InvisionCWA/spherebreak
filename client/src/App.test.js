import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

jest.mock('socket.io-client', () => ({
  io: () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ entries: [] }),
}));

describe('App', () => {
  test('renders landing and enters main menu', () => {
    render(<App />);
    expect(screen.getAllByText(/Celestial Break/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));
    expect(screen.getByText(/Player Session/i)).toBeTruthy();
  });

  test('opens tutorial screen from main menu', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));
    fireEvent.click(screen.getByRole('button', { name: /Interactive Tutorial/i }));
    expect(screen.getByText(/How to Play/i)).toBeTruthy();
  });

  test('join-code input is mobile-friendly', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }));
    fireEvent.click(screen.getByRole('button', { name: /Multiplayer Lobby/i }));
    const codeInput = screen.getByPlaceholderText(/Enter 6-character code/i);
    expect(codeInput).toHaveAttribute('autocapitalize', 'characters');
    expect(codeInput).toHaveAttribute('autocorrect', 'off');
    expect(codeInput).toHaveAttribute('autocomplete', 'off');
  });
});
