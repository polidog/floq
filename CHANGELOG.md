# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
