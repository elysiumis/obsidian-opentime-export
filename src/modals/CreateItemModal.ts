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
    MarkdownView,
    Notice
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
    DayOfWeek,
    Step,
    RepeatsSettings,
    RepeatsPer,
    RepeatsEndType
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
    private categories: string = '';
    private estimateMinutes: number = 0;
    private steps: Step[] = [];

    // Recurrence fields
    private repeatsEnabled: boolean = false;
    private repeatsCount: number = 1;
    private repeatsPer: RepeatsPer = 'Day';
    private repeatsWeekdays: string[] = [];
    private repeatsEndType: RepeatsEndType = 'Never';
    private repeatsEndCount: number = 10;
    private repeatsEndDate: string = '';

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
        new Setting(contentEl).setName('Create new item').setHeading();

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
                        .addOption('goal', 'goal')
                        .addOption('task', 'task')
                        .addOption('habit', 'habit')
                        .addOption('reminder', 'reminder')
                        .addOption('event', 'event')
                        .addOption('appointment', 'appointment')
                        .addOption('project', 'project')
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

        new Setting(container)
            .setName('Duration (minutes)')
            .setDesc('Estimated time to complete')
            .addText(text => {
                text
                    .setPlaceholder('60')
                    .setValue(this.estimateMinutes > 0 ? String(this.estimateMinutes) : '')
                    .onChange(value => {
                        this.estimateMinutes = parseInt(value) || 0;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
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
            .setDesc('0 = none, 1-3 = low, 4-6 = medium, 7-10 = high')
            .addSlider(slider => {
                slider
                    .setLimits(0, 10, 1)
                    .setValue(this.priority)
                    .setDynamicTooltip()
                    .onChange(value => {
                        this.priority = value;
                    });
            });

        new Setting(container)
            .setName('Duration (minutes)')
            .setDesc('Estimated time to complete')
            .addText(text => {
                text
                    .setPlaceholder('30')
                    .setValue(this.estimateMinutes > 0 ? String(this.estimateMinutes) : '')
                    .onChange(value => {
                        this.estimateMinutes = parseInt(value) || 0;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
            });
    }

    private buildHabitFields(container: HTMLElement) {
        new Setting(container)
            .setName('Frequency')
            .setDesc('How often should this habit occur?')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('daily', 'daily')
                    .addOption('weekly', 'weekly')
                    .addOption('custom', 'custom days')
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

        new Setting(container)
            .setName('Duration (minutes)')
            .setDesc('How long does this habit take?')
            .addText(text => {
                text
                    .setPlaceholder('15')
                    .setValue(this.estimateMinutes > 0 ? String(this.estimateMinutes) : '')
                    .onChange(value => {
                        this.estimateMinutes = parseInt(value) || 0;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
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
                    .setPlaceholder('alice, bob, carol')
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

        new Setting(container)
            .setName('Duration (minutes)')
            .setDesc('Estimated total time for project')
            .addText(text => {
                text
                    .setPlaceholder('120')
                    .setValue(this.estimateMinutes > 0 ? String(this.estimateMinutes) : '')
                    .onChange(value => {
                        this.estimateMinutes = parseInt(value) || 0;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
            });
    }

    private buildCommonFields(container: HTMLElement) {
        // Categories
        new Setting(container)
            .setName('Categories')
            .setDesc('Comma-separated categories (labels)')
            .addText(text => {
                text
                    .setPlaceholder('personal, health, work')
                    .setValue(this.categories)
                    .onChange(value => {
                        this.categories = value;
                    });
            });

        // Tags
        new Setting(container)
            .setName('Tags')
            .setDesc('Comma-separated tags')
            .addText(text => {
                text
                    .setPlaceholder('important, urgent, review')
                    .setValue(this.tags)
                    .onChange(value => {
                        this.tags = value;
                    });
            });

        // Steps section (for goals, tasks, projects)
        if (['goal', 'task', 'project'].includes(this.itemType)) {
            this.buildStepsSection(container);
        }

        // Recurrence section (for goals, tasks, habits)
        if (['goal', 'task', 'habit'].includes(this.itemType)) {
            this.buildRecurrenceSection(container);
        }

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

    private buildStepsSection(container: HTMLElement) {
        const stepsContainer = container.createDiv({ cls: 'opentime-steps-section' });
        new Setting(stepsContainer).setName('Steps (checklist)').setHeading();

        // Show existing steps
        const stepsList = stepsContainer.createDiv({ cls: 'opentime-steps-list' });
        this.renderSteps(stepsList);

        // Add step button
        new Setting(stepsContainer)
            .setName('Add step')
            .addText(text => {
                text.setPlaceholder('Step title...');
                text.inputEl.id = 'new-step-input';
            })
            .addButton(button => {
                button
                    .setButtonText('+')
                    .onClick(() => {
                        const input = stepsContainer.querySelector('#new-step-input') as HTMLInputElement;
                        if (input && input.value.trim()) {
                            this.steps.push({
                                id: `step_${Date.now()}`,
                                title: input.value.trim(),
                                completed: false,
                                order: this.steps.length,
                                status: 'pending'
                            });
                            input.value = '';
                            this.renderSteps(stepsList);
                        }
                    });
            });
    }

    private renderSteps(container: HTMLElement) {
        container.empty();
        this.steps.forEach((step, index) => {
            const stepEl = container.createDiv({ cls: 'opentime-step-item' });

            // Step title
            stepEl.createSpan({ text: `${index + 1}. ${step.title}`, cls: 'opentime-step-title' });

            // Remove button
            const removeBtn = stepEl.createEl('button', { text: '×', cls: 'opentime-step-remove' });
            removeBtn.addEventListener('click', () => {
                this.steps = this.steps.filter(s => s.id !== step.id);
                this.renderSteps(container);
            });
        });
    }

    private buildRecurrenceSection(container: HTMLElement) {
        const recurrenceContainer = container.createDiv({ cls: 'opentime-recurrence-section' });

        // Enable recurrence toggle
        new Setting(recurrenceContainer)
            .setName('Repeats')
            .setDesc('Make this a recurring item')
            .addToggle(toggle => {
                toggle
                    .setValue(this.repeatsEnabled)
                    .onChange(value => {
                        this.repeatsEnabled = value;
                        // Show/hide recurrence options
                        const options = recurrenceContainer.querySelector('.opentime-recurrence-options') as HTMLElement;
                        if (options) {
                            options.toggleClass('opentime-recurrence-hidden', !value);
                        }
                    });
            });

        // Recurrence options (hidden by default)
        const optionsContainerCls = this.repeatsEnabled ? 'opentime-recurrence-options' : 'opentime-recurrence-options opentime-recurrence-hidden';
        const optionsContainer = recurrenceContainer.createDiv({ cls: optionsContainerCls });

        // Count and Period
        new Setting(optionsContainer)
            .setName('Repeat')
            .setDesc('How often to repeat')
            .addText(text => {
                text
                    .setPlaceholder('1')
                    .setValue(String(this.repeatsCount))
                    .onChange(value => {
                        this.repeatsCount = parseInt(value) || 1;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.addClass('opentime-narrow-input');
            })
            .addDropdown(dropdown => {
                dropdown
                    .addOption('Day', 'day(s)')
                    .addOption('Week', 'week(s)')
                    .addOption('Month', 'month(s)')
                    .addOption('Year', 'year(s)')
                    .setValue(this.repeatsPer)
                    .onChange((value: RepeatsPer) => {
                        this.repeatsPer = value;
                        // Show/hide weekday selector
                        const weekdaySec = optionsContainer.querySelector('.opentime-weekday-section') as HTMLElement;
                        if (weekdaySec) {
                            weekdaySec.toggleClass('opentime-weekday-hidden', value !== 'Week');
                        }
                    });
            });

        // Weekday selector (for weekly)
        const weekdayCls = this.repeatsPer === 'Week' ? 'opentime-weekday-section' : 'opentime-weekday-section opentime-weekday-hidden';
        const weekdaySection = optionsContainer.createDiv({ cls: weekdayCls });

        new Setting(weekdaySection)
            .setName('On days')
            .setDesc('Select days of the week');

        const weekdayButtons = weekdaySection.createDiv({ cls: 'opentime-weekday-buttons' });
        const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        weekdays.forEach(day => {
            const btn = weekdayButtons.createEl('button', {
                text: day,
                cls: this.repeatsWeekdays.includes(day) ? 'opentime-weekday-btn active' : 'opentime-weekday-btn'
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.repeatsWeekdays.includes(day)) {
                    this.repeatsWeekdays = this.repeatsWeekdays.filter(d => d !== day);
                    btn.removeClass('active');
                } else {
                    this.repeatsWeekdays.push(day);
                    btn.addClass('active');
                }
            });
        });

        // End type
        new Setting(optionsContainer)
            .setName('Ends')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('Never', 'never')
                    .addOption('After', 'after X occurrences')
                    .addOption('On Date', 'on specific date')
                    .setValue(this.repeatsEndType)
                    .onChange((value: RepeatsEndType) => {
                        this.repeatsEndType = value;
                        // Show/hide end options
                        const afterSec = optionsContainer.querySelector('.opentime-end-after') as HTMLElement;
                        const dateSec = optionsContainer.querySelector('.opentime-end-date') as HTMLElement;
                        if (afterSec) afterSec.toggleClass('opentime-end-hidden', value !== 'After');
                        if (dateSec) dateSec.toggleClass('opentime-end-hidden', value !== 'On Date');
                    });
            });

        // After X occurrences
        const afterCls = this.repeatsEndType === 'After' ? 'opentime-end-after' : 'opentime-end-after opentime-end-hidden';
        const afterSection = optionsContainer.createDiv({ cls: afterCls });
        new Setting(afterSection)
            .setName('Occurrences')
            .addText(text => {
                text
                    .setPlaceholder('10')
                    .setValue(String(this.repeatsEndCount))
                    .onChange(value => {
                        this.repeatsEndCount = parseInt(value) || 10;
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
            });

        // On specific date
        const dateCls = this.repeatsEndType === 'On Date' ? 'opentime-end-date' : 'opentime-end-date opentime-end-hidden';
        const dateSection = optionsContainer.createDiv({ cls: dateCls });
        new Setting(dateSection)
            .setName('End date')
            .addText(text => {
                text
                    .setValue(this.repeatsEndDate)
                    .onChange(value => {
                        this.repeatsEndDate = value;
                    });
                text.inputEl.type = 'date';
            });
    }

    private handleSubmit(): void {
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

        // Export to folder
        if (!this.settings.elysiumFolderPath) {
            new Notice('Export folder not configured. Please set it in plugin settings.');
            return;
        }

        const success = this.elysiumExporter.exportItem(
            item,
            this.settings.elysiumFolderPath,
            this.settings.defaultTimezone
        );
        if (!success) {
            return;
        }

        // Insert markdown if requested
        if (this.insertIntoNote && this.currentFile) {
            this.insertMarkdown(item);
        }

        this.close();
    }

    private buildItem(): OpenTimeItem | null {
        const id = generateId(this.settings.idPrefix + '_' + this.itemType, this.title);
        const parsedTags = this.tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const parsedCategories = this.categories
            .split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);

        // Get folder path from current file
        const folderPath = this.currentFile?.parent?.path || '';

        // Build repeats settings if enabled
        const repeats: RepeatsSettings | undefined = this.repeatsEnabled ? {
            enabled: true,
            count: this.repeatsCount,
            per: this.repeatsPer,
            weekdays: this.repeatsPer === 'Week' && this.repeatsWeekdays.length > 0 ? this.repeatsWeekdays : undefined,
            end_type: this.repeatsEndType,
            end_count: this.repeatsEndType === 'After' ? this.repeatsEndCount : undefined,
            end_date: this.repeatsEndType === 'On Date' ? this.repeatsEndDate : undefined
        } : undefined;

        // Base item properties
        const baseProps = {
            id,
            title: this.title.trim(),
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            categories: parsedCategories.length > 0 ? parsedCategories : undefined,
            notes: this.notes.trim() || undefined,
            steps: this.steps.length > 0 ? this.steps : undefined,
            x_obsidian: {
                source_file: this.currentFile?.path || 'unknown',
                folder_path: folderPath || undefined
            }
        };

        switch (this.itemType) {
            case 'goal': {
                const goalItem: GoalItem = {
                    type: 'goal',
                    kind: 'goal',
                    target_date: this.targetDate || undefined,
                    progress: 0,
                    estimate_minutes: this.estimateMinutes > 0 ? this.estimateMinutes : undefined,
                    repeats,
                    ...baseProps
                };
                return goalItem;
            }

            case 'task': {
                const taskItem: TaskItem = {
                    type: 'task',
                    status: 'todo',
                    due: this.dueDate || undefined,
                    scheduled_start: this.scheduledStart ? `${this.scheduledStart}T09:00:00` : undefined,
                    priority: this.priority > 0 ? this.priority : undefined,
                    estimate_minutes: this.estimateMinutes > 0 ? this.estimateMinutes : undefined,
                    repeats,
                    ...baseProps
                };
                return taskItem;
            }

            case 'habit': {
                const habitItem: HabitItem = {
                    type: 'habit',
                    pattern: {
                        freq: this.habitFrequency
                    },
                    window: (this.windowStart || this.windowEnd) ? {
                        start_time: this.windowStart || undefined,
                        end_time: this.windowEnd || undefined
                    } : undefined,
                    streak: { current: 0, longest: 0 },
                    estimate_minutes: this.estimateMinutes > 0 ? this.estimateMinutes : undefined,
                    repeats,
                    ...baseProps
                };
                return habitItem;
            }

            case 'reminder': {
                if (!this.reminderDate || !this.reminderTime) {
                    new Notice('Please set reminder date and time');
                    return null;
                }
                const reminderItem: ReminderItem = {
                    type: 'reminder',
                    time: `${this.reminderDate}T${this.reminderTime}:00`,
                    ...baseProps
                };
                return reminderItem;
            }

            case 'event': {
                if (!this.startDate || !this.startTime) {
                    new Notice('Please set start date and time');
                    return null;
                }
                const eventItem: EventItem = {
                    type: 'event',
                    start: `${this.startDate}T${this.startTime}:00`,
                    end: `${this.endDate || this.startDate}T${this.endTime || this.startTime}:00`,
                    timezone: this.settings.defaultTimezone,
                    location: this.location || undefined,
                    ...baseProps
                };
                return eventItem;
            }

            case 'appointment': {
                if (!this.startDate || !this.startTime) {
                    new Notice('Please set start date and time');
                    return null;
                }
                const attendeesList = this.attendees
                    .split(',')
                    .map(a => a.trim())
                    .filter(a => a.length > 0);
                const appointmentItem: AppointmentItem = {
                    type: 'appointment',
                    start: `${this.startDate}T${this.startTime}:00`,
                    end: `${this.endDate || this.startDate}T${this.endTime || this.startTime}:00`,
                    attendees: attendeesList,
                    location: this.location || undefined,
                    ...baseProps
                };
                return appointmentItem;
            }

            case 'project': {
                const projectItem: ProjectItem = {
                    type: 'project',
                    kind: 'project',
                    target_date: this.targetDate || undefined,
                    progress: 0,
                    children: [],
                    estimate_minutes: this.estimateMinutes > 0 ? this.estimateMinutes : undefined,
                    ...baseProps
                };
                return projectItem;
            }

            default: {
                return null;
            }
        }
    }

    private insertMarkdown(item: OpenTimeItem): void {
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
            case 'goal': {
                return `## Goal: ${item.title}${item.target_date ? ` (Target: ${item.target_date})` : ''}`;
            }

            case 'task': {
                let taskMd = `- [ ] ${item.title}`;
                if (item.due) taskMd += ` 📅 ${item.due}`;
                if (item.scheduled_start) taskMd += ` ⏳ ${item.scheduled_start.split('T')[0]}`;
                return taskMd;
            }

            case 'habit': {
                return `- [ ] ${item.title} 🔁 ${item.pattern?.freq || 'daily'}`;
            }

            case 'reminder': {
                const reminderDateTime = item.time.replace('T', ' @ ').slice(0, -3);
                return `- ⏰ ${item.title} @ ${reminderDateTime}`;
            }

            case 'event': {
                const startTime = item.start.split('T')[1]?.slice(0, 5) || '';
                const endTime = item.end.split('T')[1]?.slice(0, 5) || '';
                return `- ${startTime} - ${endTime} ${item.title}${item.location ? ` (${item.location})` : ''}`;
            }

            case 'appointment': {
                const apptStart = item.start.split('T')[1]?.slice(0, 5) || '';
                const apptEnd = item.end.split('T')[1]?.slice(0, 5) || '';
                const attendeesStr = item.attendees.length > 0 ? ` 👥 ${item.attendees.join(', ')}` : '';
                return `- ${apptStart} - ${apptEnd} ${item.title}${attendeesStr}`;
            }

            case 'project': {
                return `## Project: ${item.title}${item.target_date ? ` (Target: ${item.target_date})` : ''}`;
            }
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
