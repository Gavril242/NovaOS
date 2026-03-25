# NovaOS

NovaOS is a calico-inspired browser desktop built around Supabase-backed chat, files, music, feed, notifications, and arcade apps.

## Team

This project is developed by two people:

- **Backend Developer**: Handles Supabase database schema, tables, functions, triggers, RLS policies, and real-time features.
- **Frontend Developer**: Builds React components, UI/UX, state management, and Supabase client integration.

## Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, ShadCN UI, Zustand, React Query
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Deployment**: Vercel (frontend), Supabase (backend)

## Features

- **Desktop Environment**: Windows 11-inspired UI with customizable wallpapers, themes, and icon positions
- **Apps**: Browser, Messenger, Friends, Notifications, Media Player, Music Player, Text Editor, File Manager, Recycle Bin, Social Feed, Arcade
- **Social Features**: Real-time messaging, friend requests, social posts with likes/comments
- **File System**: Desktop files, storage uploads, recycle bin
- **Gaming**: Built-in games like Misa Catch, arcade integration
- **Notifications**: Real-time notifications for messages, friend requests, social activity

## Simulated Development History

To demonstrate the collaborative development process, here's a simulated git history with 10 commits that build up to the current codebase. Commits alternate between backend and frontend developers, each adding a new feature.

### Commit 1: Backend - Initial Supabase Setup
**Author**: Backend Developer  
**Message**: "feat: initialize Supabase schema with user profiles and authentication"

- Created `supabase/novaos_schema.sql`
- Added `profiles` table with user data
- Set up authentication triggers
- Configured basic RLS policies

### Commit 2: Frontend - Basic Desktop Layout
**Author**: Frontend Developer  
**Message**: "feat: implement basic desktop layout with taskbar and icons"

- Created main `NovaOS` component
- Added desktop grid, taskbar, start menu
- Implemented icon positioning and basic UI
- Set up React Router and basic app structure

### Commit 3: Backend - Desktop State Persistence
**Author**: Backend Developer  
**Message**: "feat: add desktop state table for wallpaper and icon positions"

- Added `desktop_state` table
- Created functions for user desktop initialization
- Added triggers for automatic desktop creation on signup
- Updated RLS policies for desktop data

### Commit 4: Frontend - Window Management System
**Author**: Frontend Developer  
**Message**: "feat: implement window management with drag, resize, minimize/maximize"

- Added window component with controls (close, minimize, maximize)
- Implemented drag-and-drop for window positioning
- Added z-index management for window stacking
- Created window state management with Zustand

### Commit 5: Backend - File Storage System
**Author**: Backend Developer  
**Message**: "feat: add file storage tables for desktop files and uploads"

- Created `desktop_files` and `storage_files` tables
- Added file type validation and size limits
- Implemented recycle bin functionality
- Added indexes for efficient file queries

### Commit 6: Frontend - Core Apps (Text Editor & File Manager)
**Author**: Frontend Developer  
**Message**: "feat: implement text editor and file manager apps"

- Created `Win11TextEditor` component with syntax highlighting
- Built `Win11FileManager` with file CRUD operations
- Added file type icons and context menus
- Integrated with Supabase for file persistence

### Commit 7: Backend - Messaging and Friends System
**Author**: Backend Developer  
**Message**: "feat: add messaging and friends tables with real-time notifications"

- Created `messages`, `friends`, and `notifications` tables
- Added notification triggers for messages and friend requests
- Implemented friend request acceptance logic
- Added real-time subscriptions support

### Commit 8: Frontend - Social Apps (Messenger & Friends)
**Author**: Frontend Developer  
**Message**: "feat: implement messenger and friends apps with real-time chat"

- Created `Win11Messenger` for real-time messaging
- Built `Win11Friends` for friend management
- Added `Win11Notifications` for system alerts
- Integrated Supabase realtime subscriptions

### Commit 9: Backend - Social Feed System
**Author**: Backend Developer  
**Message**: "feat: add social posts, likes, and comments with notification triggers"

- Created `social_posts`, `post_likes`, `post_comments` tables
- Added triggers for social activity notifications
- Implemented nested comments support
- Added social feed indexes and policies

### Commit 10: Frontend - Advanced Apps (Browser, Media, Social Feed, Arcade)
**Author**: Frontend Developer  
**Message**: "feat: implement remaining apps - browser, media players, social feed, arcade"

- Created `Win11Browser` with YouTube integration
- Built `Win11MediaPlayer` and `Win11MusicPlayer`
- Added `Win11SocialFeed` with posts and interactions
- Implemented `Win11Arcade` with Misa Catch game
- Added final UI polish and responsive design

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Backend Setup

1. Create a Supabase project
2. Run the SQL in `supabase/novaos_schema.sql` to set up the database
3. Configure environment variables in `.env.local`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Deployment

- **Frontend**: Deploy to Vercel with `npm run build`
- **Backend**: Supabase handles database and auth automatically

## Architecture

- **Frontend**: Component-based React app with Zustand for state, React Query for data fetching
- **Backend**: Supabase provides database, auth, realtime subscriptions, and file storage
- **Real-time**: Uses Supabase realtime for live updates across messaging, notifications, and social features
- **Security**: Row Level Security (RLS) ensures users can only access their own data

## Contributing

1. Backend Developer: Focus on database schema changes, new tables/functions, performance optimizations
2. Frontend Developer: Focus on UI components, user experience, Supabase client integration
3. Test all changes locally before pushing
4. Use descriptive commit messages following the pattern: `feat/fix/refactor: description`
