# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.1] - 2026-08-28

### Changed
- Support Node.js 26. Removed the unused `better-sqlite3` native dependency, which failed to load on Node.js 26 with `ERR_DLOPEN_FAILED`; database access already goes through `@libsql/client`
- Declare `engines.node: ">=20.0.0"` and add a CI workflow that builds and smoke-tests on Node.js 20 / 22 / 24 / 26
- Update dependencies (hono) and fix security vulnerabilities

## [1.9.0] - 2026-06-11

### Added
- Multiple calendar registration: register any number of calendars (iCal URLs and Google OAuth calendars can be mixed) and view merged events from all of them. New commands: `floq calendar list`, `floq calendar remove <id|number|name>`, `floq calendar remove --all`, per-calendar `floq calendar enable/disable [id]`. `floq calendar select` now registers multiple Google calendars at once (comma-separated)
- `floq schedule` command to view your schedule from the CLI: `floq schedule` (today), `floq schedule tomorrow`, `floq schedule week`, or `floq schedule --days <n>`. Events are grouped by date with calendar name labels

### Changed
- `floq calendar add` is now additive (registers a new calendar instead of replacing the existing one). Legacy single-calendar configuration is migrated automatically

### Fixed
- `floq calendar enable <id>` now also lifts a global display disable so enabled events are actually shown

## [1.8.0] - 2026-05-26

### Added
- Project deletion in both CLI and TUI (`floq project delete <id>`, alias `rm`). When a project has tasks, choose to delete them too (cascade) or move them back to Inbox. CLI supports `--with-tasks` / `--keep-tasks` / `--force`; in the TUI press `D` on the Projects tab. Fully undoable in the TUI.

### Changed
- Update dependencies (uuid, qs) and fix security vulnerabilities

## [1.7.0] - 2026-02-28

### Added
- QR code display for Turso config sharing (`floq config turso --qr`) for easy cross-device setup

## [1.6.0] - 2026-02-25

### Added
- MCP (Model Context Protocol) server for LLM integration (`floq mcp`)
- Configurable insights weeks via `floq config insights-weeks <n>` (default: 2)
- npm version, downloads, and license badges to README

## [1.5.0] - 2026-02-20

### Added
- `completedAt` field to accurately track when tasks are completed, preventing Insights stats from shifting when editing done tasks
- Completion date display in task detail view for done tasks (all 3 UI variants)
- Undo/redo history persistence to SQLite for crash-safe operation

## [1.4.1] - 2026-02-13

### Fixed
- Fix project detail view not accessible in DQ and Mario themed UIs (Enter key handler was missing in project-detail mode, and back navigation from task-detail did not return to project-detail)

## [1.4.0] - 2026-02-09

### Added
- Insights command (`floq insights`) showing weekly completion stats, daily breakdown, status/context/effort distributions, project progress, and average completion time
- InsightsModal in TUI (press `I` to open) with scrollable view across all 6 UI variants
- `--weeks` option for insights to customize analysis period
- Focus Mode toggle (`g` key) and Focus Filter (`G` key) for task prioritization
- Effort Size feature (`E` key) with Small/Medium/Large classification

## [1.3.3] - 2026-02-03

### Changed
- Backfill Japanese changelog for v0.9.0 to v1.3.1

## [1.3.2] - 2026-02-03

### Added
- Japanese changelog (CHANGELOG.ja.md) support in release skill

## [1.3.1] - 2026-02-03

### Added
- Monthly calendar grid view with date navigation (hjkl keys, H/L for month switch)
- Vertical layout for calendar modal for better balance
- Yesterday/today/tomorrow labels with i18n support

### Changed
- Extended event cache to cover current and next month
- Improved message when no upcoming events remain

### Fixed
- Keyboard handling when calendar modal is open

## [1.3.0] - 2025-02-03

### Added
- Google Calendar integration with two authentication methods:
  - iCal URL support for simple, auth-free read-only access
  - Google OAuth with device flow for full API access
- Calendar events display in TUI sidebar showing today's schedule
- Calendar modal (Shift+C) for detailed event view in all UI themes
- Calendar CLI commands: add, remove, list, show, login, logout, select, config
- Bilingual support (EN/JA) for all calendar features
- Calendar configuration display in `floq config show` command

## [1.2.0] - 2025-02-02

### Added
- Clock component with real-time date/time display in all views
- Locale-aware date format (en: "Sun, Feb 2", ja: "02/02(日)")
- Configurable date format via `floq config dateformat` command
- Theme-specific clock labels (standard: i18n, Mario/DQ: "TIME")

## [1.1.0] - 2025-02-02

### Added
- Dragon Quest battle UI for pomodoro timer
- Super Mario World style UI for Mario theme
- Command selection and inn theme for breaks

### Fixed
- Mario UI with progress bar ground improvement
- drizzle-kit upgrade to fix esbuild security vulnerability

## [1.0.0] - 2025-02-02

### Added
- Pomodoro timer state persistence to database for cross-device sync
- Focus mode toggle during pomodoro execution (f key)
- Focus mode support for DQ/Mario themes
- Pomodoro shortcuts display in footer when timer is running
- `--enable` and `--clear` options for Turso config management

## [0.9.0] - 2025-02-01

### Added
- Pomodoro timer in TUI header (25min work / 5min short break / 15min long break)
- Pomodoro keyboard shortcuts: F=start, Space=pause/resume, S=skip, X=stop
- Terminal bell notification on Pomodoro phase complete
- i18n support for Pomodoro (EN/JA)

## [0.8.0] - 2025-01-31

### Added
- Persist context filter across sessions
- Use alternate screen buffer for fullscreen TUI
- Japanese changelog support (i18n)

### Fixed
- Missing set-context mode UI for DQ/Mario themes

### Changed
- npm publish via GitHub Actions with OIDC trusted publishing

## [0.7.0] - 2025-01-31

### Added
- Mario theme with SFC/Nintendo-style UI
- Mario theme support for both GTD and Kanban modes
- Dragon Quest style status header (job class, level, HP, MP)
- Task detail view to Dragon Quest theme
- i18n support for DQ/Mario theme footers

### Fixed
- Project linking from task detail in DQ theme
- Context setting (c key) support for DQ/Mario themes
- Missing c=context in footer help text

## [0.6.0] - 2025-01-31

### Added
- Dragon Quest RPG style UI with TitledBox component
- DQ-style 2-column layouts for GTD and Kanban modes
- Dragon Quest style splash screen with configurable duration
- Splash subcommand to configure splash screen (`floq config splash`)
- Search functionality to DQ-style components
- Scroll support to all HelpModal tabs
- Demo GIFs to README (English and Japanese versions)

### Fixed
- HelpModal input handling in DQ-style components
- Modern theme textMuted visibility improved

## [0.5.0] - 2025-01-30

### Added
- Show Kanban labels in search results for Kanban mode

### Changed
- Filter done tasks to show only last 7 days by default
- Update README with recent features

## [0.4.0] - 2025-01-30

### Added
- Context feature for task filtering (@work, @home, etc.)
- Context CLI commands (list, add, remove)
- `--context` / `-c` option to add command
- `@` key to filter tasks by context in TUI
- `c` key to set context on tasks in TUI
- Context badge display on task items
- Context display in task detail view
- Add new contexts directly from TUI

## [0.3.1] - 2025-01-29

### Fixed
- Repository URL corrected to polidog/floq

## [0.3.0] - 2025-01-29

### Added
- Vim-like undo/redo functionality

### Fixed
- Help modal input handling and splash screen theme color

## [0.2.3] - 2025-01-29

### Improved
- Search now supports arrow key navigation and jumping to task on Enter

## [0.2.2] - 2025-01-29

### Added
- 10 new themes: Nord, Dracula, Monokai, Gruvbox, Tokyo Night, Catppuccin, Ocean, Sakura, MSX, PC-98
- In-TUI settings switcher for theme, mode, and language (S key)

### Fixed
- MSX theme now uses authentic TMS9918 color palette

### Changed
- Turso database indicator changed to uppercase for better visibility

## [0.2.1] - 2025-01-29

### Added
- Task deletion with D key and inline confirmation dialog
- Status label display in task detail view
- Info tab translations for internationalization

## [0.2.0] - 2025-01-29

### Added
- Project detail view with navigation to sub-tasks
- Project progress bar showing completion status
- Task search feature (Ctrl+f)
- Setup wizard for first-time users
- Project linking from task detail view
- What's New tab in help modal for viewing changelog
- ModeSelector component for easy view mode switching
- Database reset command (`floq config reset-db`)
- Task detail view in Kanban mode
- Done tab in GTD mode TUI
- Move-to-waiting feature with contact input

### Changed
- Task-detail footer now respects theme colors
- Scroll support added to What's New tab

### Fixed
- Turso metadata file migration path

## [0.1.0] - 2025-01-29

### Added
- Initial release of Floq (formerly gtd-cli)
- GTD-based task management with Inbox/Next/Waiting/Someday/Done workflow
- Kanban board view mode
- 16+ retro themes (DOS, Commodore, Atari, etc.)
- Internationalization support (English and Japanese)
- Turso cloud sync support
- Project management with sub-tasks
- XDG Base Directory compliance
- Task comments feature
- Due date support
