# Floq

[日本語](./README.ja.md)

A terminal-based GTD (Getting Things Done) task manager with MS-DOS style themes.

## Features

- **TUI Interface**: Interactive terminal UI built with Ink (React for CLI)
- **GTD Workflow**: Inbox, Next Actions, Waiting For, Someday/Maybe
- **Projects**: Organize tasks into projects
- **Themes**: Multiple themes including MS-DOS nostalgic styles
- **i18n**: English and Japanese support
- **Vim-style Navigation**: Use hjkl or arrow keys

## Installation

```bash
npm install
npm run build
npm link
```

## Usage

### TUI Mode

```bash
floq
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-5` | Switch tabs |
| `h/l` or `←/→` | Previous/Next tab |
| `j/k` or `↑/↓` | Navigate tasks |
| `a` | Add task |
| `d` | Mark as done |
| `n` | Move to Next Actions |
| `s` | Move to Someday/Maybe |
| `i` | Move to Inbox |
| `p` | Convert to project |
| `P` | Link to project |
| `Enter` | Open project (on Projects tab) |
| `Esc/b` | Back from project |
| `r` | Refresh |
| `?` | Help |
| `q` | Quit |

### CLI Commands

```bash
# Add task
floq add "Task title"
floq add "Task title" -p "Project name"

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
```

## Configuration

```bash
# Show configuration
floq config show

# Set language
floq config lang en    # English
floq config lang ja    # Japanese

# Set theme
floq config theme modern           # Default
floq config theme norton-commander # MS-DOS style
floq config theme dos-prompt       # Green on black
floq config theme turbo-pascal     # IDE style

# Set database path
floq config db /path/to/custom.db
floq config db                     # Reset to default
```

## Themes

### modern (default)
Clean, minimal style with single borders.

### norton-commander
- Double-line borders (╔═╗║╚═╝)
- Uppercase headers
- Function key bar at bottom
- Cyan/yellow color scheme

### dos-prompt
- Single-line borders
- Green text (CRT monitor style)
- Simple `>` selection indicator

### turbo-pascal
- Double-line borders
- Yellow accents
- IDE-style appearance

> **Note**: Background colors depend on your terminal settings. For the full DOS experience, configure your terminal's background color to blue (#0000AA).

## Data Storage

- Config: `~/.config/gtd-cli/config.json`
- Database: `~/.local/share/gtd-cli/gtd.db`

## License

MIT
