# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
