# Floq

[日本語](./README.ja.md)

A terminal-based GTD (Getting Things Done) task manager with MS-DOS style themes.

![Floq Demo](./assets/demo.gif)

## Features

- **TUI Interface**: Interactive terminal UI built with Ink (React for CLI)
- **GTD Workflow**: Inbox, Next Actions, Waiting For, Someday/Maybe, Done (shows last 7 days)
- **Kanban Mode**: 3-column kanban board view (TODO, Doing, Done)
- **Projects**: Organize tasks into projects with progress tracking
- **Contexts**: Tag tasks with contexts (@work, @home, etc.) and filter by context. New tasks inherit the active context filter
- **Task Search**: Quick search across all tasks with `/`
- **Comments**: Add notes and comments to tasks
- **Cloud Sync**: Optional sync with [Turso](https://turso.tech/) using embedded replicas
- **Themes**: Multiple themes including MS-DOS nostalgic styles and Dragon Quest RPG style
- **Splash Screen**: Configurable startup splash with Dragon Quest style for retro themes
- **i18n**: English and Japanese support
- **Vim-style Navigation**: Use hjkl or arrow keys
- **Setup Wizard**: First-run wizard for easy configuration

## Installation

```bash
npm install -g floq
```

### From Source

```bash
git clone https://github.com/polidog/gtd-cli.git
cd gtd-cli
npm install
npm run build
npm link
```

## Usage

### TUI Mode

```bash
floq
```

### Keyboard Shortcuts (GTD Mode)

| Key | Action |
|-----|--------|
| `1-6` | Switch tabs (Inbox/Next/Waiting/Someday/Projects/Done) |
| `h/l` or `←/→` | Previous/Next tab |
| `j/k` or `↑/↓` | Navigate tasks |
| `a` | Add task |
| `d` | Mark as done |
| `n` | Move to Next Actions |
| `s` | Move to Someday/Maybe |
| `i` | Move to Inbox |
| `w` | Move to Waiting For (prompts for person) |
| `p` | Convert to project |
| `P` | Link to project |
| `c` | Set context |
| `@` | Filter by context |
| `Enter` | Open task detail / Open project |
| `Esc/b` | Back |
| `/` | Search tasks |
| `r` | Refresh |
| `u` | Undo |
| `Ctrl+r` | Redo |
| `?` | Help |
| `q` | Quit |

#### Search

| Key | Action |
|-----|--------|
| `/` | Start search mode |
| `↑/↓` or `Ctrl+j/k` | Navigate search results |
| `Enter` | Jump to selected task's tab and select it |
| `Esc` | Cancel search |

#### Project Detail View

| Key | Action |
|-----|--------|
| `j/k` | Navigate tasks |
| `a` | Add task to project |
| `d` | Mark task as done |
| `Enter` | Open task detail |
| `Esc/b` | Back to projects list |

#### Task Detail View

| Key | Action |
|-----|--------|
| `i` | Add comment |
| `d` | Delete selected comment |
| `P` | Link to project |
| `j/k` | Navigate comments |
| `Esc/b` | Back to list / project |

### Keyboard Shortcuts (Kanban Mode)

| Key | Action |
|-----|--------|
| `1-3` | Switch columns (TODO/Doing/Done) |
| `h/l` or `←/→` | Previous/Next column |
| `j/k` or `↑/↓` | Navigate tasks |
| `a` | Add task |
| `d` | Mark as done |
| `m` | Move task right (→) |
| `Backspace` | Move task left (←) |
| `c` | Set context |
| `@` | Filter by context |
| `Enter` | Open task detail |
| `/` | Search tasks |
| `r` | Refresh |
| `u` | Undo |
| `Ctrl+r` | Redo |
| `?` | Help |
| `q` | Quit |

#### Task Detail View (Kanban)

| Key | Action |
|-----|--------|
| `i` | Add comment |
| `d` | Delete selected comment |
| `j/k` | Navigate comments |
| `Esc/b` | Back to board |

### Setup Wizard

On first run, Floq will launch an interactive setup wizard to configure:
- Language (English/Japanese)
- Theme selection
- View mode (GTD/Kanban)

You can also run the wizard manually:

```bash
floq setup
```

### CLI Commands

```bash
# Add task
floq add "Task title"
floq add "Task title" -p "Project name"
floq add "Task title" -c work           # With context

# List tasks
floq list              # All non-done tasks
floq list inbox        # Inbox only
floq list next         # Next actions
floq list waiting      # Waiting for
floq list someday      # Someday/maybe
floq list projects     # Projects

# Move task
floq move <id> next
floq move <id> waiting "Person name"
floq move <id> someday

# Complete task
floq done <id>

# Projects
floq project add "Project name"
floq project list
floq project show <id>
floq project complete <id>

# Comments
floq comment <id> "Comment text"  # Add comment
floq comment <id>                 # List comments

# Contexts
floq context list                 # List available contexts
floq context add <name>           # Add new context
floq context remove <name>        # Remove context
```

## Configuration

```bash
# Show configuration
floq config show

# Set language
floq config lang en    # English
floq config lang ja    # Japanese

# Set theme (interactive selector with j/k navigation)
floq config theme

# Or specify directly
floq config theme modern           # Default
floq config theme synthwave        # Neon 80s aesthetic

# Set view mode (interactive selector)
floq config mode

# Or specify directly
floq config mode gtd               # GTD workflow (default)
floq config mode kanban            # Kanban board

# Set database path
floq config db /path/to/custom.db
floq config db                     # Reset to default

# Splash screen settings
floq config splash                 # Show current setting
floq config splash 3000            # Set to 3 seconds
floq config splash off             # Disable splash screen
floq config splash key             # Wait for key press

# Reset database (delete all data)
floq db reset                      # With confirmation
floq db reset --force              # Skip confirmation
```

## Cloud Sync (Turso)

Floq supports cloud synchronization using [Turso](https://turso.tech/), a SQLite-compatible database service. With embedded replicas, your data syncs to the cloud while remaining available offline.

### Setup

1. Create a Turso database at [turso.tech](https://turso.tech/)
2. Get your database URL and auth token
3. Configure Floq:

```bash
# Enable Turso sync
floq config turso --url libsql://your-db.turso.io --token your-auth-token

# Check configuration
floq config show

# Manual sync
floq sync

# Disable Turso sync
floq config turso --disable
```

### How It Works

- **Embedded Replicas**: Local SQLite database syncs with Turso cloud
- **Offline Support**: Works offline, syncs when connected
- **Auto Sync**: Background sync every 60 seconds when online
- **Separate Database**: Turso mode uses `floq-turso.db` to avoid conflicts

### Status Indicator

- TUI header shows connection status (cloud icon for Turso, local icon for local mode)
- CLI commands display `🔄 Turso sync: hostname` when Turso is enabled

## Themes

26 themes available. Use `floq config theme` for interactive selection (j/k to navigate).

Some themes feature a **Dragon Quest RPG style UI** with titled message boxes, 2-column layouts, and retro splash screens. Themes with DQ-style: `turbo-pascal`, `msx`, `pc-98`.

![Dragon Quest Style UI](./assets/demo_dq.gif)

| Theme | Description |
|-------|-------------|
| `modern` | Clean, minimal style (default) |
| `norton-commander` | MS-DOS file manager style |
| `dos-prompt` | Green CRT monitor |
| `turbo-pascal` | Borland IDE style |
| `classic-mac` | Macintosh System 7 monochrome |
| `apple-ii` | Apple ][ green phosphor |
| `commodore-64` | C64 blue/purple palette |
| `amiga-workbench` | Amiga orange & blue |
| `matrix` | Digital rain green |
| `amber-crt` | Amber monitor |
| `phosphor` | CRT phosphor glow |
| `solarized-dark` | Solarized dark palette |
| `solarized-light` | Solarized light palette |
| `synthwave` | Neon 80s aesthetic |
| `paper` | Light minimal theme |
| `coffee` | Warm brown tones |
| `nord` | Arctic, north-bluish palette |
| `dracula` | Dark theme with vibrant colors |
| `monokai` | Classic editor vivid colors |
| `gruvbox` | Retro groove warm tones |
| `tokyo-night` | Tokyo night lights inspired |
| `catppuccin` | Soothing pastel theme |
| `ocean` | Deep sea blue theme |
| `sakura` | Cherry blossom pink |
| `msx` | MSX computer (TMS9918) |
| `pc-98` | NEC PC-9801 style |

> **Note**: Background colors depend on your terminal settings.

## Data Storage

- Config: `~/.config/floq/config.json`
- Database: `~/.local/share/floq/floq.db` (or `floq-turso.db` with Turso enabled)

## License

MIT
