# OpenTime Export for Elysium

Export calendar-related content from Obsidian to [Elysium's](https://elysium.is) OpenTime (.ot) format.

## Features

- **Task Export**: Parses Obsidian Tasks plugin format with emoji dates
- **Event Export**: Parses Day Planner style time blocks
- **Frontmatter Export**: Extracts structured items from YAML frontmatter
- **Automatic Sync**: Optional auto-export when files change
- **Create Items**: Create goals, tasks, events, habits, and more directly from Obsidian
- **Link Items**: Link Obsidian notes to existing Elysium items
- **Elysium Integration**: Export directly to Elysium's watched folder with full sync

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

- **Export all to Elysium** (`Ctrl/Cmd + P` → search): Scans all configured folders and exports to Elysium
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

When creating items, you can configure:
- **Priority** (0-10 scale)
- **Duration** (estimated minutes)
- **Categories** (labels, separate from tags)
- **Steps** (checklist items for goals, tasks, projects)
- **Recurrence** (repeating items with flexible schedules)
- **Tags** and **Notes**

### Link to Elysium Items

Link existing Obsidian notes to items already in Elysium:

- **Command**: `Link note to Elysium item` (`Ctrl/Cmd + P`)
- **Right-click menu**: Right-click in editor → "Link to Elysium item"
- **File menu**: Right-click a file → "Link to Elysium item"

This allows you to connect your notes to existing Elysium items for bidirectional navigation.

### Settings

#### Elysium Integration
- **Elysium OpenTime folder**: Click "Choose Folder" to select Elysium's OpenTime folder
- **Export Mode**: Automatically synced from Elysium preferences (Single File or Per Item)

#### Data Sources
- **Parse Tasks plugin format**: Extract tasks with emoji dates
- **Parse Day Planner format**: Extract time blocks
- **Parse YAML frontmatter**: Extract items from frontmatter

#### Scope
- **Include folders**: Only scan these folders (comma-separated)
- **Exclude folders**: Skip these folders (comma-separated)

#### Behavior
- **Default timezone**: IANA timezone for events (e.g., America/Los_Angeles)
- **Default event duration**: Duration in minutes for events without end time
- **Auto-export on save**: Automatically update when you save a file
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
  - type: goal
    id: obs_goal_learn-spanish
    title: Learn Spanish
    kind: goal
    target_date: "2025-06-01"
    progress: 0
    estimate_minutes: 120
    categories: [Personal, Education]
    tags: [language, self-improvement]
    steps:
      - id: step_1
        title: Complete Duolingo basics
        completed: false
        order: 0
        status: pending
      - id: step_2
        title: Practice with native speaker
        completed: false
        order: 1
        status: pending
    repeats:
      enabled: true
      count: 1
      per: Day
      end_type: Never
    x_obsidian:
      source_file: "goals/language.md"

  - type: task
    id: obs_task_review-pr-123
    title: "Review PR #123"
    status: todo
    due: "2025-01-15"
    priority: 7
    estimate_minutes: 30
    x_obsidian:
      source_file: "daily/2025-01-15.md"

  - type: event
    id: obs_ev_2025-01-15_09-00
    title: Team standup
    start: "2025-01-15T09:00:00-08:00"
    end: "2025-01-15T10:00:00-08:00"
    x_obsidian:
      source_file: "daily/2025-01-15.md"
```

## Elysium Integration

### Automatic Sync

1. Set the Elysium OpenTime folder in plugin settings
2. Created/exported items are written directly to Elysium's watched folder
3. Elysium auto-imports them based on your export mode preference
4. Click any item in Elysium to jump back to its source in Obsidian

### Export Modes

The export mode is read from Elysium's preferences:

- **Single File**: All items merged into one file (default: `elysium-schedule.ot`)
- **Per Item**: Each item gets its own file (e.g., `elysium-task-review-pr.ot`)

### Extension Fields

- **x_obsidian**: Preserves source file information for round-trip editing
- **x_elysium**: Signals Obsidian linking info (set when linking notes to items)

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
