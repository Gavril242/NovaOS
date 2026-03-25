import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Win11Arcade } from '../Win11Arcade';

describe('Win11Arcade', () => {
  it('renders all three game titles in the sidebar', () => {
    render(<Win11Arcade />);
    // Each name appears in both the sidebar button and the header; use getAllByText
    expect(screen.getAllByText('Sky Catch').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Memory Flip')).toBeInTheDocument();
    expect(screen.getByText('Neon Dots')).toBeInTheDocument();
  });

  it('shows Sky Catch by default', () => {
    render(<Win11Arcade />);
    expect(screen.getByText('Click the star as many times as you can.')).toBeInTheDocument();
  });

  it('switches to Memory Flip when its sidebar button is clicked', async () => {
    const user = userEvent.setup();
    render(<Win11Arcade />);
    // Use the sidebar button specifically (inside the sidebar div)
    const sidebarButtons = document.querySelector('.w-64')!.querySelectorAll('button');
    await user.click(sidebarButtons[1]); // Memory Flip is the second game
    expect(screen.getByText(/matched pairs/i)).toBeInTheDocument();
  });

  it('switches to Neon Dots when its sidebar button is clicked', async () => {
    const user = userEvent.setup();
    render(<Win11Arcade />);
    const sidebarButtons = document.querySelector('.w-64')!.querySelectorAll('button');
    await user.click(sidebarButtons[2]); // Neon Dots is the third game
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
  });

  describe('Sky Catch game', () => {
    it('starts with a score of 0', () => {
      render(<Win11Arcade />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('increments the score when the star is clicked', async () => {
      const user = userEvent.setup();
      render(<Win11Arcade />);
      await user.click(screen.getByRole('button', { name: '⭐' }));
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Memory Flip game', () => {
    it('renders 8 memory cards face-down', async () => {
      const user = userEvent.setup();
      render(<Win11Arcade />);
      const sidebarButtons = document.querySelector('.w-64')!.querySelectorAll('button');
      await user.click(sidebarButtons[1]);
      const cards = screen.getAllByRole('button', { name: '?' });
      expect(cards).toHaveLength(8);
    });

    it('flips a card face-up on click', async () => {
      const user = userEvent.setup();
      render(<Win11Arcade />);
      const sidebarButtons = document.querySelector('.w-64')!.querySelectorAll('button');
      await user.click(sidebarButtons[1]);
      const cards = screen.getAllByRole('button', { name: '?' });
      await user.click(cards[0]);
      expect(screen.getAllByRole('button', { name: '?' })).toHaveLength(7);
    });
  });

  describe('Neon Dots game', () => {
    it('starts with score 0', async () => {
      const user = userEvent.setup();
      render(<Win11Arcade />);
      const sidebarButtons = document.querySelector('.w-64')!.querySelectorAll('button');
      await user.click(sidebarButtons[2]);
      expect(screen.getByText('Score: 0')).toBeInTheDocument();
    });

    it('increments score when the dot is clicked', async () => {
      const user = userEvent.setup();
      render(<Win11Arcade />);
      const sidebarButtons = document.querySelector('.w-64')!.querySelectorAll('button');
      await user.click(sidebarButtons[2]);
      const dot = document.querySelector('.rounded-full.bg-cyan-300') as HTMLElement;
      await user.click(dot);
      expect(screen.getByText('Score: 1')).toBeInTheDocument();
    });
  });
});
