import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Win11MusicPlayer } from '../Win11MusicPlayer';
import type { StorageFileRow } from '@/types/novaos';

const makeSong = (id: string, filename: string): StorageFileRow => ({
  id,
  filename,
  file_type: 'song',
  file_url: `https://cdn.example.com/${filename}`,
  size: 1024 * 1024 * 3, // 3 MB
  created_at: new Date().toISOString(),
});

const defaultProps = {
  songs: [],
  currentSong: null,
  isPlaying: false,
  volume: 0.8,
  onSelectSong: vi.fn(),
  onTogglePlay: vi.fn(),
  onSetVolume: vi.fn(),
  onNext: vi.fn(),
};

describe('Win11MusicPlayer', () => {
  it('shows empty-state when no songs are provided', () => {
    render(<Win11MusicPlayer {...defaultProps} />);
    expect(screen.getByText('No music uploaded yet.')).toBeInTheDocument();
  });

  it('renders a list of songs', () => {
    const songs = [makeSong('1', 'song-a.mp3'), makeSong('2', 'song-b.mp3')];
    render(<Win11MusicPlayer {...defaultProps} songs={songs} />);
    expect(screen.getByText('song-a.mp3')).toBeInTheDocument();
    expect(screen.getByText('song-b.mp3')).toBeInTheDocument();
  });

  it('calls onSelectSong when a song in the list is clicked', async () => {
    const user = userEvent.setup();
    const onSelectSong = vi.fn();
    const songs = [makeSong('1', 'my-track.mp3')];
    render(<Win11MusicPlayer {...defaultProps} songs={songs} onSelectSong={onSelectSong} />);
    await user.click(screen.getByText('my-track.mp3').closest('button')!);
    expect(onSelectSong).toHaveBeenCalledWith(songs[0]);
  });

  it('shows "Select a song to play" when no song is selected', () => {
    const songs = [makeSong('1', 'track.mp3')];
    render(<Win11MusicPlayer {...defaultProps} songs={songs} />);
    expect(screen.getByText('Select a song to play')).toBeInTheDocument();
  });

  it('renders player controls when a currentSong is set', () => {
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} isPlaying={false} />);
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next song/i })).toBeInTheDocument();
  });

  it('shows "Pause" when isPlaying is true', () => {
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} isPlaying={true} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('calls onTogglePlay when Play/Pause is clicked', async () => {
    const user = userEvent.setup();
    const onTogglePlay = vi.fn();
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} onTogglePlay={onTogglePlay} />);
    await user.click(screen.getByRole('button', { name: /play/i }));
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it('calls onNext when Next Song is clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} onNext={onNext} />);
    await user.click(screen.getByRole('button', { name: /next song/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onSetVolume when the volume slider changes', () => {
    const onSetVolume = vi.fn();
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} onSetVolume={onSetVolume} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0.5' } });
    expect(onSetVolume).toHaveBeenCalledWith(0.5);
  });

  it('shows volume percentage', () => {
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} volume={0.6} />);
    expect(screen.getByText('60% Volume')).toBeInTheDocument();
  });

  it('renders an audio element with the correct src', () => {
    const song = makeSong('1', 'track.mp3');
    render(<Win11MusicPlayer {...defaultProps} songs={[song]} currentSong={song} />);
    const audio = document.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio?.src).toContain('track.mp3');
  });
});
