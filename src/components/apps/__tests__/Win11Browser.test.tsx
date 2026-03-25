import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Win11Browser } from '../Win11Browser';

/** Returns the 4 navigation icon-buttons [back, forward, refresh, home] */
const getNavButtons = () =>
  Array.from(document.querySelector('.flex.items-center.gap-1.text-gray-500')!.querySelectorAll('button'));

describe('Win11Browser', () => {
  beforeEach(() => {
    window.open = vi.fn();
  });

  it('shows the home screen by default', () => {
    render(<Win11Browser />);
    expect(screen.getByText('Browse with Misa')).toBeInTheDocument();
  });

  it('renders all quick links', () => {
    render(<Win11Browser />);
    expect(screen.getByRole('button', { name: 'YouTube' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supabase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wikipedia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OpenAI' })).toBeInTheDocument();
  });

  it('navigates to a YouTube embed when a YouTube URL is submitted', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.clear(input);
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByTitle('YouTube')).toBeInTheDocument();
  });

  it('navigates to a web iframe for a non-YouTube URL', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.clear(input);
    await user.type(input, 'https://supabase.com');
    fireEvent.submit(input.closest('form')!);
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.src).toContain('supabase.com');
  });

  it('navigates to a search view for plain text', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.clear(input);
    await user.type(input, 'best cat pictures');
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('Search the web')).toBeInTheDocument();
    expect(screen.getByText('"best cat pictures"')).toBeInTheDocument();
  });

  it('opens DuckDuckGo in a new tab from the search view', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.clear(input);
    await user.type(input, 'some query');
    fireEvent.submit(input.closest('form')!);
    await user.click(screen.getByRole('button', { name: /duckduckgo/i }));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('duckduckgo.com'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('goes home when the Home nav button is clicked', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    // Navigate away first
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.type(input, 'some query');
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('Search the web')).toBeInTheDocument();
    // Home is the 4th button in the nav group (index 3)
    await user.click(getNavButtons()[3]);
    expect(screen.getByText('Browse with Misa')).toBeInTheDocument();
  });

  it('quick link navigates to the web view', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    await user.click(screen.getByRole('button', { name: 'Supabase' }));
    const iframe = document.querySelector('iframe');
    expect(iframe?.src).toContain('supabase.com');
  });

  it('calls window.open when the Open button in the toolbar is clicked', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    // The Open button is to the right of the URL bar — find by its text content
    const openBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Open')
    )!;
    await user.click(openBtn);
    expect(window.open).toHaveBeenCalled();
  });

  it('back button is disabled on the first page', () => {
    render(<Win11Browser />);
    expect(getNavButtons()[0]).toBeDisabled();
  });

  it('back button becomes enabled after navigation', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.type(input, 'query');
    fireEvent.submit(input.closest('form')!);
    expect(getNavButtons()[0]).not.toBeDisabled();
  });

  it('navigating back restores the previous view', async () => {
    const user = userEvent.setup();
    render(<Win11Browser />);
    // Go to search view
    const input = screen.getByPlaceholderText(/search or enter/i);
    await user.type(input, 'hello');
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('Search the web')).toBeInTheDocument();
    // Go back to home
    await user.click(getNavButtons()[0]);
    expect(screen.getByText('Browse with Misa')).toBeInTheDocument();
  });
});
