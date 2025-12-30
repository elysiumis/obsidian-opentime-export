/**
 * Create Item Modal
 *
 * Modal for creating OpenTime items directly from Obsidian
 * Supports all 7 item types: goal, task, habit, reminder, event, appointment, project
 */

import {
    App,
    Modal,
    Setting,
    TFile,
    Editor,
    MarkdownView,
    Notice,
    DropdownComponent,
    TextComponent
} from 'obsidian';
import {
    OpenTimeItemType,
    OpenTimeItem,
    GoalItem,
    TaskItem,
    HabitItem,
    ReminderItem,
    EventItem,
    AppointmentItem,
    ProjectItem,
    generateId,
    formatDate,
    HabitFrequency,
    DayOfWeek
} from '../types/opentime';
import { OpenTimeExportSettings } from '../SettingsTab';
import { ElysiumExporter } from '../ElysiumExporter';
import { OpenTimeExporter } from '../OpenTimeExporter';

export class CreateItemModal extends Modal {
    private settings: OpenTimeExportSettings;
    private elysiumExporter: ElysiumExporter;
    private openTimeExporter: OpenTimeExporter;
    private initialType: OpenTimeItemType | null;
    private initialText: string;
    private currentFile: TFile | null;

    // Form fields
    private itemType: OpenTimeItemType = 'task';
    private title: string = '';
    private insertIntoNote: boolean;

    // Task fields
    private dueDate: string = '';
    private scheduledStart: string = '';
    private priority: number = 0;

    // Event/Appointment fields
    private startDate: string = '';
    private startTime: string = '';
    private endDate: string = '';
    private endTime: string = '';
    private location: string = '';
    private attendees: string = '';

    // Goal/Project fields
    private targetDate: string = '';

    // Habit fields
    private habitFrequency: HabitFrequency = 'daily';
    private habitDays: DayOfWeek[] = [];
    private windowStart: string = '';
    private windowEnd: string = '';

    // Reminder fields
    private reminderTime: string = '';
    private reminderDate: string = '';

    // Common fields
    private notes: string = '';
    private tags: string = '';

    // UI elements for dynamic updates
    private contentEl: HTMLElement;

    constructor(
        app: App,
        settings: OpenTimeExportSettings,
        pluginVersion: string,
        initialType: OpenTimeItemType | null = null,
        initialText: string = ''
    ) {
        super(app);
        this.settings = settings;
        this.elysiumExporter = new ElysiumExporter(pluginVersion);
        this.openTimeExporter = new OpenTimeExporter(pluginVersion);
        this.initialType = initialType;
        this.initialText = initialText;
        this.insertIntoNote = settings.insertMarkdownByDefault;

        // Get current file
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        this.currentFile = activeView?.file || null;

        // Set initial type if provided
        if (initialType) {
            this.itemType = initialType;
        }

        // Set title from selection or context
        if (initialText) {
            this.title = initialText.trim();
        }

        // Set default dates to today
        const today = formatDate(new Date());
        this.dueDate = today;
        this.startDate = today;
        this.endDate = today;
        this.targetDate = today;
        this.reminderDate = today;
    }

    onOpen() {
        const { contentEl } = this;
        this.contentEl = contentEl;

        contentEl.empty();
        contentEl.addClass('opentime-create-modal');

        // Title
        contentEl.createEl('h2', { text: 'Create Item for Elysium' });

        // Build form
        this.buildForm();
    }

    private buildForm() {
        const { contentEl } = this;

        // Clear previous form content (keep title)
        const existingForm = contentEl.querySelector('.opentime-form');
        if (existingForm) {
            existingForm.remove();
        }

        const formContainer = contentEl.createDiv({ cls: 'opentime-form' });

        // Item Type selector (only if no initial type)
        if (!this.initialType) {
            new Setting(formContainer)
                .setName('Type')
                .setDesc('What kind of item are you creating?')
                .addDropdown(dropdown => {
                    dropdown
                        .addOption('goal', 'Goal')
                        .addOption('task', 'Task')
                        .addOption('habit', 'Habit')
                        .addOption('reminder', 'Reminder')
                        .addOption('event', 'Event')
                        .addOption('appointment', 'Appointment')
                        .addOption('project', 'Project')
                        .setValue(this.itemType)
                        .onChange((value: OpenTimeItemType) => {
                            this.itemType = value;
                            this.buildForm(); // Rebuild form with new type fields
                        });
                });
        } else {
            // Show type as read-only
            formContainer.createEl('p', {
                text: `Creating: ${this.initialType.charAt(0).toUpperCase() + this.initialType.slice(1)}`,
                cls: 'opentime-type-label'
            });
        }

        // Title (common to all)
        new Setting(formContainer)
            .setName('Title')
            .setDesc('Name of the item')
            .addText(text => {
                text
                    .setPlaceholder('Enter title...')
                    .setValue(this.title)
                    .onChange(value => {
                        this.title = value;
                    });
                text.inputEl.addClass('opentime-title-input');
            });

        // Type-specific fields
        this.buildTypeSpecificFields(formContainer);

        // Common optional fields
        this.buildCommonFields(formContainer);

        // Insert into note checkbox
        new Setting(formContainer)
            .setName('Insert into note')
            .setDesc('Also add markdown to the current note')
            .addToggle(toggle => {
                toggle
                    .setValue(this.insertIntoNote)
                    .onChange(value => {
                        this.insertIntoNote = value;
                    });
            });

        // Buttons
        const buttonContainer = formContainer.createDiv({ cls: 'opentime-buttons' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const createBtn = buttonContainer.createEl('button', {
            text: 'Create',
            cls: 'mod-cta'
        });
        createBtn.addEventListener('click', () => this.handleSubmit());
    }

    private buildTypeSpecificFields(container: HTMLElement) {
        switch (this.itemType) {
            case 'goal':
                this.buildGoalFields(container);
                break;
            case 'task':
                this.buildTaskFields(container);
                break;
            case 'habit':
                this.buildHabitFields(container);
                break;
            case 'reminder':
                this.buildReminderFields(container);
                break;
            case 'event':
                this.buildEventFields(container);
                break;
            case 'appointment':
                this.buildAppointmentFields(container);
                break;
            case 'project':
                this.buildProjectFields(container);
                break;
        }
    }

    private buildGoalFields(container: HTMLElement) {
        new Setting(container)
            .setName('Target date')
            .setDesc('When do you want to achieve this goal?')
            .addText(text => {
                text
                    .setPlaceholder('YYYY-MM-DD')
                    .setValue(this.targetDate)
                    .onChange(value => {
                        this.targetDate = value;
                    });
                text.inputEl.type = 'date';
            });
    }

    private buildTaskFields(container: HTMLElement) {
        new Setting(container)
            .setName('Due date')
            .setDesc('When is this task due?')
            .addText(text => {
                text
                    .setPlaceholder('YYYY-MM-DD')
                    .setValue(this.dueDate)
                    .onChange(value => {
                        this.dueDate = value;
                    });
                text.inputEl.type = 'date';
            });

        new Setting(container)
            .setName('Scheduled start')
            .setDesc('When do you plan to work on this?')
            .addText(text => {
                text
                    .setPlaceholder('YYYY-MM-DD')
                    .setValue(this.scheduledStart)
                    .onChange(value => {
                        this.scheduledStart = value;
                    });
                text.inputEl.type = 'date';
            });

        new Setting(container)
            .setName('Priority')
            .setDesc('0 = none, 1 = low, 2 = medium, 3 = high')
            .addSlider(slider => {
                slider
                    .setLimits(0, 3, 1)
                    .setValue(this.priority)
                    .setDynamicTooltip()
                    .onChange(value => {
                        this.priority = value;
                    });
            });
    }

    private buildHabitFields(container: HTMLElement) {
        new Setting(container)
            .setName('Frequency')
            .setDesc('How often should this habit occur?')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('daily', 'Daily')
                    .addOption('weekly', 'Weekly')
                    .addOption('custom', 'Custom days')
                    .setValue(this.habitFrequency)
                    .onChange((value: HabitFrequency) => {
                        this.habitFrequency = value;
                    });
            });

        new Setting(container)
            .setName('Window start')
            .setDesc('Earliest time to do this habit')
            .addText(text => {
                text
                    .setPlaceholder('HH:MM')
                    .setValue(this.windowStart)
                    .onChange(value => {
                        this.windowStart = value;
                    });
                text.inputEl.type = 'time';
            });

        new Setting(container)
            .setName('Window end')
            .setDesc('Latest time to do this habit')
            .addText(text => {
                text
                    .setPlaceholder('HH:MM')
                    .setValue(this.windowEnd)
                    .onChange(value => {
                        this.windowEnd = value;
                    });
                text.inputEl.type = 'time';
            });
    }

    private buildReminderFields(container: HTMLElement) {
        new Setting(container)
            .setName('Reminder date')
            .setDesc('What date to remind you')
            .addText(text => {
                text
                    .setPlaceholder('YYYY-MM-DD')
                    .setValue(this.reminderDate)
                    .onChange(value => {
                        this.reminderDate = value;
                    });
                text.inputEl.type = 'date';
            });

        new Setting(container)
            .setName('Reminder time')
            .setDesc('What time to remind you')
            .addText(text => {
                text
                    .setPlaceholder('HH:MM')
                    .setValue(this.reminderTime)
                    .onChange(value => {
                        this.reminderTime = value;
                    });
                text.inputEl.type = 'time';
            });
    }

    private buildEventFields(container: HTMLElement) {
        new Setting(container)
            .setName('Start date')
            .addText(text => {
                text
                    .setValue(this.startDate)
                    .onChange(value => {
                        this.startDate = value;
                    });
                text.inputEl.type = 'date';
            });

        new Setting(container)
            .setName('Start time')
            .addText(text => {
                text
                    .setPlaceholder('HH:MM')
                    .setValue(this.startTime)
                    .onChange(value => {
                        this.startTime = value;
                    });
                text.inputEl.type = 'time';
            });

        new Setting(container)
            .setName('End date')
            .addText(text => {
                text
                    .setValue(this.endDate)
                    .onChange(value => {
                        this.endDate = value;
                    });
                text.inputEl.type = 'date';
            });

        new Setting(container)
            .setName('End time')
            .addText(text => {
                text
                    .setPlaceholder('HH:MM')
                    .setValue(this.endTime)
                    .onChange(value => {
                        this.endTime = value;
                    });
                text.inputEl.type = 'time';
            });

        new Setting(container)
            .setName('Location')
            .addText(text => {
                text
                    .setPlaceholder('Where is this event?')
                    .setValue(this.location)
                    .onChange(value => {
                        this.location = value;
                    });
            });
    }

    private buildAppointmentFields(container: HTMLElement) {
        // Same as event fields plus attendees
        this.buildEventFields(container);

        new Setting(container)
            .setName('Attendees')
            .setDesc('Comma-separated list of attendees')
            .addText(text => {
                text
                    .setPlaceholder('John, Jane, Bob')
                    .setValue(this.attendees)
                    .onChange(value => {
                        this.attendees = value;
                    });
            });
    }

    private buildProjectFields(container: HTMLElement) {
        new Setting(container)
            .setName('Target date')
            .setDesc('When should this project be completed?')
            .addText(text => {
                text
                    .setPlaceholder('YYYY-MM-DD')
                    .setValue(this.targetDate)
                    .onChange(value => {
                        this.targetDate = value;
                    });
                text.inputEl.type = 'date';
            });
    }

    private buildCommonFields(container: HTMLElement) {
        // Tags
        new Setting(container)
            .setName('Tags')
            .setDesc('Comma-separated tags')
            .addText(text => {
                text
                    .setPlaceholder('work, priority, project-x')
                    .setValue(this.tags)
                    .onChange(value => {
                        this.tags = value;
                    });
            });

        // Notes
        new Setting(container)
            .setName('Notes')
            .setDesc('Additional notes')
            .addTextArea(textarea => {
                textarea
                    .setPlaceholder('Any additional details...')
                    .setValue(this.notes)
                    .onChange(value => {
                        this.notes = value;
                    });
                textarea.inputEl.rows = 3;
            });
    }

    private async handleSubmit() {
        // Validate
        if (!this.title.trim()) {
            new Notice('Please enter a title');
            return;
        }

        // Build the item
        const item = this.buildItem();
        if (!item) {
            return;
        }

        // Export to Elysium folder if enabled
        if (this.settings.elysiumFolderEnabled && this.settings.elysiumFolderPath) {
            const success = await this.elysiumExporter.exportItem(
                item,
                this.settings.elysiumFolderPath,
                this.settings.defaultTimezone
            );
            if (!success) {
                return;
            }
        } else {
            new Notice('Elysium folder not configured. Please set it in plugin settings.');
            return;
        }

        // Insert markdown if requested
        if (this.insertIntoNote && this.currentFile) {
            await this.insertMarkdown(item);
        }

        this.close();
    }

    private buildItem(): OpenTimeItem | null {
        const id = generateId(this.settings.idPrefix + '_' + this.itemType, this.title);
        const parsedTags = this.tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Get folder path from current file
        const folderPath = this.currentFile?.parent?.path || '';

        // Base item properties
        const baseProps = {
            id,
            title: this.title.trim(),
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            notes: this.notes.trim() || undefined,
            x_obsidian: {
                source_file: this.currentFile?.path || 'unknown',
                vault_name: this.settings.defaultVaultName || undefined
            },
            x_elysium: {
                obsidian_enabled: true,
                obsidian_vault_name: this.settings.defaultVaultName || undefined,
                obsidian_folder_path: folderPath || undefined,
                obsidian_behavior: this.settings.defaultObsidianBehavior
            }
        };

        switch (this.itemType) {
            case 'goal':
                return {
                    type: 'goal',
                    kind: 'goal',
                    target_date: this.targetDate || undefined,
                    progress: 0,
                    ...baseProps
                } as GoalItem;

            case 'task':
                return {
                    type: 'task',
                    status: 'todo',
                    due: this.dueDate || undefined,
                    scheduled_start: this.scheduledStart ? `${this.scheduledStart}T09:00:00` : undefined,
                    priority: this.priority > 0 ? this.priority : undefined,
                    ...baseProps
                } as TaskItem;

            case 'habit':
                return {
                    type: 'habit',
                    pattern: {
                        freq: this.habitFrequency
                    },
                    window: (this.windowStart || this.windowEnd) ? {
                        start_time: this.windowStart || undefined,
                        end_time: this.windowEnd || undefined
                    } : undefined,
                    streak: { current: 0, longest: 0 },
                    ...baseProps
                } as HabitItem;

            case 'reminder':
                if (!this.reminderDate || !this.reminderTime) {
                    new Notice('Please set reminder date and time');
                    return null;
                }
                return {
                    type: 'reminder',
                    time: `${this.reminderDate}T${this.reminderTime}:00`,
                    ...baseProps
                } as ReminderItem;

            case 'event':
                if (!this.startDate || !this.startTime) {
                    new Notice('Please set start date and time');
                    return null;
                }
                return {
                    type: 'event',
                    start: `${this.startDate}T${this.startTime}:00`,
                    end: `${this.endDate || this.startDate}T${this.endTime || this.startTime}:00`,
                    timezone: this.settings.defaultTimezone,
                    location: this.location || undefined,
                    ...baseProps
                } as EventItem;

            case 'appointment':
                if (!this.startDate || !this.startTime) {
                    new Notice('Please set start date and time');
                    return null;
                }
                const attendeesList = this.attendees
                    .split(',')
                    .map(a => a.trim())
                    .filter(a => a.length > 0);
                return {
                    type: 'appointment',
                    start: `${this.startDate}T${this.startTime}:00`,
                    end: `${this.endDate || this.startDate}T${this.endTime || this.startTime}:00`,
                    attendees: attendeesList,
                    location: this.location || undefined,
                    ...baseProps
                } as AppointmentItem;

            case 'project':
                return {
                    type: 'project',
                    kind: 'project',
                    target_date: this.targetDate || undefined,
                    progress: 0,
                    children: [],
                    ...baseProps
                } as ProjectItem;

            default:
                return null;
        }
    }

    private async insertMarkdown(item: OpenTimeItem) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.editor) {
            return;
        }

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        const markdown = this.generateMarkdown(item);

        // Insert at cursor position
        editor.replaceRange(markdown + '\n', cursor);
    }

    private generateMarkdown(item: OpenTimeItem): string {
        switch (item.type) {
            case 'goal':
                const goal = item as GoalItem;
                return `## Goal: ${goal.title}${goal.target_date ? ` (Target: ${goal.target_date})` : ''}`;

            case 'task':
                const task = item as TaskItem;
                let taskMd = `- [ ] ${task.title}`;
                if (task.due) taskMd += ` 📅 ${task.due}`;
                if (task.scheduled_start) taskMd += ` ⏳ ${task.scheduled_start.split('T')[0]}`;
                return taskMd;

            case 'habit':
                const habit = item as HabitItem;
                return `- [ ] ${habit.title} 🔁 ${habit.pattern?.freq || 'daily'}`;

            case 'reminder':
                const reminder = item as ReminderItem;
                const reminderDateTime = reminder.time.replace('T', ' @ ').slice(0, -3);
                return `- ⏰ ${reminder.title} @ ${reminderDateTime}`;

            case 'event':
                const event = item as EventItem;
                const startTime = event.start.split('T')[1]?.slice(0, 5) || '';
                const endTime = event.end.split('T')[1]?.slice(0, 5) || '';
                return `- ${startTime} - ${endTime} ${event.title}${event.location ? ` (${event.location})` : ''}`;

            case 'appointment':
                const appt = item as AppointmentItem;
                const apptStart = appt.start.split('T')[1]?.slice(0, 5) || '';
                const apptEnd = appt.end.split('T')[1]?.slice(0, 5) || '';
                const attendeesStr = appt.attendees.length > 0 ? ` 👥 ${appt.attendees.join(', ')}` : '';
                return `- ${apptStart} - ${apptEnd} ${appt.title}${attendeesStr}`;

            case 'project':
                const project = item as ProjectItem;
                return `## Project: ${project.title}${project.target_date ? ` (Target: ${project.target_date})` : ''}`;

            default:
                return `- ${item.title}`;
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
