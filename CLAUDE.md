# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Floq is a terminal-based GTD (Getting Things Done) task manager built with TypeScript. It features dual view modes (GTD tabs and Kanban board), 16+ retro themes, i18n support (EN/JA), and optional cloud sync via Turso.

## Build & Development Commands

```bash
npm run build      # TypeScript compilation to /dist
npm run dev        # Watch mode for development
npm start          # Run the CLI (node dist/index.js)

# Database migrations (Drizzle Kit)
npm run db:generate   # Generate migration files
npm run db:migrate    # Run pending migrations
```

## Architecture

### Directory Structure

```
src/
├── index.ts          # Entry point, initializes CLI and DB
├── cli.ts            # Commander.js CLI setup
├── config.ts         # Configuration management
├── paths.ts          # XDG Base Directory paths + legacy migration
├── db/
│   ├── index.ts      # Database client (local SQLite or Turso)
│   └── schema.ts     # Drizzle ORM schema (tasks, comments)
├── commands/         # CLI command implementations
├── ui/               # Ink/React TUI components
│   ├── App.tsx       # Main GTD mode component
│   ├── components/
│   │   ├── KanbanBoard.tsx  # Kanban view
│   │   └── ...
│   └── theme/        # Theme system (16+ themes)
└── i18n/             # Internationalization (en.ts, ja.ts)
```

### Key Technologies

- **CLI Framework**: Commander.js
- **TUI Framework**: Ink (React for CLI)
- **Database**: Drizzle ORM + libsql (SQLite / Turso)
- **Language**: TypeScript (strict mode, ES modules)

### Data Flow

1. `index.ts` initializes database (local or Turso mode)
2. CLI parses args via Commander.js
3. No args → Launch TUI (Ink render of `App.tsx` or `KanbanBoard.tsx`)
4. With args → Execute command handler from `commands/`

### Database Schema

Two tables in SQLite:
- **tasks**: id, title, description, status (inbox/next/waiting/someday/done), isProject, parentId, waitingFor, dueDate, timestamps
- **comments**: id, taskId, content, createdAt

Projects are tasks with `isProject: true`. Sub-tasks link via `parentId`.

### View Modes

- **GTD Mode**: Tab-based (Inbox/Next/Waiting/Someday/Projects/Done)
- **Kanban Mode**: 3-column (TODO maps to inbox+someday, Doing maps to next+waiting, Done)

### Theme System

Theme provider uses React Context. Each theme defines colors, border styles, and text formatting. Located in `src/ui/theme/themes.ts`.

### i18n Pattern

```typescript
import { t, fmt } from '../i18n/index.js';
const i18n = t();  // Returns translation object based on config
fmt(i18n.tui.added, { title: 'Task' });  // Template interpolation
```

## Configuration

- **Config file**: `~/.config/floq/config.json`
- **Database**: `~/.local/share/floq/floq.db` (or `floq-turso.db` with Turso)
- Follows XDG Base Directory specification
- Auto-migrates from legacy `gtd-cli` directories

## CLI Commands

```bash
floq                        # Launch TUI
floq add "Task title"       # Add task
floq list [status]          # List tasks
floq move <id> <status>     # Move task
floq done <id>              # Complete task
floq project add/list/show  # Project management
floq config theme/mode/lang # Configuration
floq sync                   # Manual Turso sync
```
