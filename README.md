# OpenTime Export for Obsidian

Export calendar-related content from Obsidian to [Elysium's](https://elysium.is) OpenTime (.ot) format.

## Features

- **Task Export**: Parses Obsidian Tasks plugin format with emoji dates
- **Event Export**: Parses Day Planner style time blocks
- **Frontmatter Export**: Extracts structured items from YAML frontmatter
- **Automatic Sync**: Optional auto-export when files change
- **Create Items**: Create goals, tasks, events, habits, and more directly from Obsidian
- **Elysium Integration**: Export directly to Elysium's watched folder with Obsidian linking enabled

## Supported Formats

### Tasks Plugin Format
```markdown
- [ ] Buy groceries 📅 2025-01-15
- [x] Call doctor ✅ 2025-01-10
- [ ] Review report ⏳ 2025-01-20 🛫 2025-01-18
```

### Day Planner Format
```markdown
- 09:00 Team standup
- 10:00 - 12:00 Deep work on project
- 14:00 Client call
```

### YAML Frontmatter
```yaml
---
type: task
title: Review proposal
due: 2025-01-20
status: todo
tags: [work, priority]
---
```

## Installation

### From Obsidian Community Plugins
1. Open Settings → Community plugins
2. Search for "OpenTime Export"
3. Click Install, then Enable

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/obsidian-opentime-export/`
3. Copy the downloaded files into the folder
4. Reload Obsidian and enable the plugin

### From Source
```bash
git clone https://github.com/elysiumis/obsidian-opentime-export
cd obsidian-opentime-export
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder.

## Usage

### Export Commands

- **Export all to OpenTime** (`Ctrl/Cmd + P` → search): Scans all configured folders and exports to a single .ot file
- **Export current file**: Exports only the active file
- **Ribbon icon**: Click the calendar icon in the left sidebar for quick export

### Create Item Commands

Create items directly from Obsidian without writing markdown first:

- **Create item for Elysium**: Opens a modal to create any item type
- **Create goal for Elysium**: Quick-create a goal
- **Create task for Elysium**: Quick-create a task
- **Create habit for Elysium**: Quick-create a habit
- **Create reminder for Elysium**: Quick-create a reminder
- **Create event for Elysium**: Quick-create an event
- **Create appointment for Elysium**: Quick-create an appointment
- **Create project for Elysium**: Quick-create a project

When creating items:
1. Fill in the item details in the modal
2. Optionally check "Insert into note" to add markdown to your current note
3. The item is exported directly to Elysium's OpenTime folder
4. Elysium auto-imports it with "Open in Obsidian" enabled

### Settings

#### Export Location
- **Export path**: Folder within your vault for .ot files
- **Export filename**: Name of the output file (default: `obsidian-calendar.ot`)

#### Data Sources
- **Parse Tasks plugin format**: Extract tasks with emoji dates
- **Parse Day Planner format**: Extract time blocks
- **Parse YAML frontmatter**: Extract items from frontmatter

#### Scope
- **Include folders**: Only scan these folders (comma-separated)
- **Exclude folders**: Skip these folders (comma-separated)

#### Behavior
- **Default timezone**: IANA timezone for events
- **Default event duration**: Duration for events without end time
- **Auto-export on save**: Automatically update when you save a file

#### Elysium Integration
- **Export directly to Elysium folder**: Write .ot files to Elysium's watched folder
- **Elysium OpenTime folder**: Full path to Elysium's OpenTime folder
- **Vault name**: How this vault appears in Elysium (for "Open in Obsidian" links)
- **Default behavior**: "Replace notes" or "Show alongside" when opening from Elysium
- **Insert markdown by default**: Also add markdown to notes when creating items

## OpenTime Format

OpenTime is a YAML-based format for representing schedules. It supports 7 item types:

| Type | Description |
|------|-------------|
| `goal` | Intentions/outcomes with target dates |
| `task` | Atomic actions with status and due dates |
| `habit` | Recurring behaviors with streaks |
| `reminder` | Time-based notifications |
| `event` | Time blocks with start/end |
| `appointment` | Events with attendees |
| `project` | Container for other items |

### Example Output

```yaml
opentime_version: "0.2"
default_timezone: "America/Los_Angeles"
generated_by: "Obsidian OpenTime Export 1.0.0"
created_at: "2025-01-15T08:00:00Z"

items:
  - type: task
    id: obs_task_review-pr-123
    title: "Review PR #123"
    status: todo
    due: "2025-01-15"
    x_obsidian:
      source_file: "daily/2025-01-15.md"
      line_number: 12
      vault_name: "Personal"
    x_elysium:
      obsidian_enabled: true
      obsidian_vault_name: "Personal"
      obsidian_folder_path: "daily"
      obsidian_behavior: replace

  - type: event
    id: obs_ev_2025-01-15_09-00
    title: "Team standup"
    start: "2025-01-15T09:00:00-08:00"
    end: "2025-01-15T10:00:00-08:00"
    x_obsidian:
      source_file: "daily/2025-01-15.md"
```

## Elysium Integration

### Automatic Sync

When you enable "Export directly to Elysium folder" in settings:
1. Created items are written directly to Elysium's OpenTime folder
2. Elysium auto-imports them with "Open in Obsidian" already enabled
3. Click any item in Elysium to jump back to its source in Obsidian

### Manual Export

For batch exports:
1. Place the `.ot` file in Elysium's configured OpenTime folder
2. Use Elysium's import function to bring items in
3. With Elysium's auto-import enabled, changes sync automatically

### Extension Fields

- **x_obsidian**: Preserves source file information for round-trip editing
- **x_elysium**: Signals to Elysium that Obsidian linking should be enabled

## Development

```bash
npm install       # Install dependencies
npm run dev       # Build with watch mode
npm run build     # Production build
```

## License

MIT

## Links

- [Elysium App](https://elysium.is)
- [OpenTime Format Specification](https://elysium.is/opentime)
