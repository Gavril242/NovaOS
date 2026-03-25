import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Win11MediaPlayer } from '../Win11MediaPlayer';

describe('Win11MediaPlayer', () => {
  it('renders the empty state when playlist is empty', () => {
    render(<Win11MediaPlayer />);
    expect(screen.getByText('Add a video to start')).toBeInTheDocument();
  });

  it('renders the input fields', () => {
    render(<Win11MediaPlayer />);
    expect(screen.getByPlaceholderText('Video title...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('YouTube URL...')).toBeInTheDocument();
  });

  it('adds a video to the playlist when both fields are filled and Add is clicked', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    await user.type(screen.getByPlaceholderText('Video title...'), 'My Video');
    await user.type(
      screen.getByPlaceholderText('YouTube URL...'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText('My Video')).toBeInTheDocument();
  });

  it('does not add a video when the URL is not a valid YouTube link', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    await user.type(screen.getByPlaceholderText('Video title...'), 'Bad Video');
    await user.type(screen.getByPlaceholderText('YouTube URL...'), 'https://example.com/notYouTube');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.queryByText('Bad Video')).not.toBeInTheDocument();
  });

  it('does not add a video when the title is empty', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    await user.type(
      screen.getByPlaceholderText('YouTube URL...'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText('Add a video to start')).toBeInTheDocument();
  });

  it('clears the inputs after a successful add', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    const titleInput = screen.getByPlaceholderText('Video title...');
    const urlInput = screen.getByPlaceholderText('YouTube URL...');
    await user.type(titleInput, 'My Video');
    await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(titleInput).toHaveValue('');
    expect(urlInput).toHaveValue('');
  });

  it('shows a YouTube iframe after adding a video', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    await user.type(screen.getByPlaceholderText('Video title...'), 'My Video');
    await user.type(
      screen.getByPlaceholderText('YouTube URL...'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    await user.click(screen.getByRole('button', { name: /add/i }));
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.src).toContain('youtube.com/embed');
  });

  it('submits on Enter key in the URL input', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    await user.type(screen.getByPlaceholderText('Video title...'), 'My Video');
    await user.type(
      screen.getByPlaceholderText('YouTube URL...'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ{Enter}'
    );
    expect(screen.getByText('My Video')).toBeInTheDocument();
  });

  it('removes a video from the playlist when its delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<Win11MediaPlayer />);
    await user.type(screen.getByPlaceholderText('Video title...'), 'My Video');
    await user.type(
      screen.getByPlaceholderText('YouTube URL...'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ{Enter}'
    );
    expect(screen.getByText('My Video')).toBeInTheDocument();
    // The Trash2 icon button is the delete button for the playlist item
    const deleteBtn = document.querySelector('.text-red-400')?.closest('button') as HTMLElement;
    await user.click(deleteBtn);
    expect(screen.queryByText('My Video')).not.toBeInTheDocument();
  });
});
