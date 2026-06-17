import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

jest.mock('socket.io-client', () => ({
  io: () => ({
    on: jest.fn(),
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
    fireEvent.click(screen.getByRole('button', { name: /Enter Main Menu/i }));
    expect(screen.getByText(/Player Session/i)).toBeTruthy();
  });

  test('opens tutorial screen from main menu', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Enter Main Menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /Interactive Tutorial/i }));
    expect(screen.getByText(/How to Play/i)).toBeTruthy();
  });
});
