/**
 * Settings Tab for OpenTime Export Plugin
 */

import { App, PluginSettingTab, Setting, Notice, TextComponent } from 'obsidian';
import OpenTimeExportPlugin from '../main';
import {
    readElysiumPreferences,
    isElysiumInstalled,
    getExportModeDescription,
    ElysiumPreferences
} from './ElysiumPreferences';

export interface OpenTimeExportSettings {
    // Elysium folder path (required)
    elysiumFolderPath: string;

    // Parsers to enable
    enableTasksParser: boolean;
    enableDayPlannerParser: boolean;
    enableFrontmatterParser: boolean;

    // Scope
    includeFolders: string; // Comma-separated
    excludeFolders: string; // Comma-separated

    // Behavior
    defaultTimezone: string;
    defaultEventDuration: number;
    autoExport: boolean;
    insertMarkdownByDefault: boolean;

    // ID generation
    idPrefix: string;
}

export const DEFAULT_SETTINGS: OpenTimeExportSettings = {
    elysiumFolderPath: '',
    enableTasksParser: true,
    enableDayPlannerParser: true,
    enableFrontmatterParser: true,
    includeFolders: '',
    excludeFolders: '',
    defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    defaultEventDuration: 30,
    autoExport: false,
    insertMarkdownByDefault: false,
    idPrefix: 'obs'
};

export class OpenTimeExportSettingTab extends PluginSettingTab {
    plugin: OpenTimeExportPlugin;
    private folderPathInput: TextComponent | null = null;
    private elysiumPrefs: ElysiumPreferences | null = null;
    private elysiumInstalled: boolean = false;

    constructor(app: App, plugin: OpenTimeExportPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        // Load Elysium preferences
        this.elysiumInstalled = await isElysiumInstalled();
        this.elysiumPrefs = await readElysiumPreferences();

        containerEl.createEl('h2', { text: 'OpenTime Export Settings' });

        // Elysium Integration Section (Top priority)
        containerEl.createEl('h3', { text: 'Elysium Integration' });

        // Status indicator
        this.renderElysiumStatus(containerEl);

        // Folder picker
        const folderSetting = new Setting(containerEl)
            .setName('Elysium OpenTime folder')
            .setDesc('Folder where Elysium watches for .ot files');

        folderSetting.addText(text => {
            text
                .setPlaceholder('Click Browse to select folder')
                .setValue(this.plugin.settings.elysiumFolderPath);
            text.inputEl.style.width = '300px';
            this.folderPathInput = text;

            // Allow manual editing as fallback
            text.onChange(async (value) => {
                this.plugin.settings.elysiumFolderPath = value;
                await this.plugin.saveSettings();
            });
        });

        folderSetting.addButton(button => {
            button
                .setButtonText('Browse...')
                .onClick(async () => {
                    const folder = await this.selectFolder();
                    if (folder) {
                        this.plugin.settings.elysiumFolderPath = folder;
                        this.folderPathInput?.setValue(folder);
                        await this.plugin.saveSettings();
                    }
                });
        });

        // Show synced export mode (read-only)
        if (this.elysiumPrefs) {
            new Setting(containerEl)
                .setName('Export mode')
                .setDesc('Synced from Elysium preferences')
                .addText(text => {
                    text
                        .setValue(getExportModeDescription(this.elysiumPrefs!))
                        .setDisabled(true);
                    text.inputEl.style.width = '300px';
                });
        }

        // Data Sources Section
        containerEl.createEl('h3', { text: 'Data Sources' });

        new Setting(containerEl)
            .setName('Parse Tasks plugin format')
            .setDesc('Extract tasks with emoji dates (📅 due, ⏳ scheduled, 🛫 start, ✅ done)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTasksParser)
                .onChange(async (value) => {
                    this.plugin.settings.enableTasksParser = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Parse Day Planner format')
            .setDesc('Extract time blocks (e.g., "09:00 - 10:00 Meeting")')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDayPlannerParser)
                .onChange(async (value) => {
                    this.plugin.settings.enableDayPlannerParser = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Parse YAML frontmatter')
            .setDesc('Extract items from frontmatter with date/type fields')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableFrontmatterParser)
                .onChange(async (value) => {
                    this.plugin.settings.enableFrontmatterParser = value;
                    await this.plugin.saveSettings();
                }));

        // Scope Section
        containerEl.createEl('h3', { text: 'Scope' });

        new Setting(containerEl)
            .setName('Include folders')
            .setDesc('Only scan these folders (comma-separated, leave empty for all)')
            .addText(text => text
                .setPlaceholder('daily, projects')
                .setValue(this.plugin.settings.includeFolders)
                .onChange(async (value) => {
                    this.plugin.settings.includeFolders = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Exclude folders')
            .setDesc('Skip these folders (comma-separated)')
            .addText(text => text
                .setPlaceholder('templates, archive')
                .setValue(this.plugin.settings.excludeFolders)
                .onChange(async (value) => {
                    this.plugin.settings.excludeFolders = value;
                    await this.plugin.saveSettings();
                }));

        // Behavior Section
        containerEl.createEl('h3', { text: 'Behavior' });

        new Setting(containerEl)
            .setName('Default timezone')
            .setDesc('IANA timezone for events without explicit timezone')
            .addText(text => text
                .setPlaceholder('America/Los_Angeles')
                .setValue(this.plugin.settings.defaultTimezone)
                .onChange(async (value) => {
                    this.plugin.settings.defaultTimezone = value || 'UTC';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default event duration')
            .setDesc('Duration in minutes for events without end time')
            .addSlider(slider => slider
                .setLimits(15, 120, 15)
                .setValue(this.plugin.settings.defaultEventDuration)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultEventDuration = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-export on save')
            .setDesc('Automatically update the .ot file when you save a note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoExport)
                .onChange(async (value) => {
                    this.plugin.settings.autoExport = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Insert markdown when creating items')
            .setDesc('Also insert markdown into the current note when creating items')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.insertMarkdownByDefault)
                .onChange(async (value) => {
                    this.plugin.settings.insertMarkdownByDefault = value;
                    await this.plugin.saveSettings();
                }));

        // Advanced Section
        containerEl.createEl('h3', { text: 'Advanced' });

        new Setting(containerEl)
            .setName('ID prefix')
            .setDesc('Prefix for generated item IDs (e.g., "obs" creates "obs_task_...")')
            .addText(text => text
                .setPlaceholder('obs')
                .setValue(this.plugin.settings.idPrefix)
                .onChange(async (value) => {
                    this.plugin.settings.idPrefix = value || 'obs';
                    await this.plugin.saveSettings();
                }));
    }

    /**
     * Render Elysium detection status
     */
    private renderElysiumStatus(container: HTMLElement): void {
        const statusEl = container.createDiv({ cls: 'setting-item' });
        const infoEl = statusEl.createDiv({ cls: 'setting-item-info' });
        const descEl = infoEl.createDiv({ cls: 'setting-item-description' });

        if (this.elysiumInstalled) {
            descEl.createSpan({
                text: '✓ Elysium detected - export mode synced from app preferences',
                cls: 'opentime-status-ok'
            });
        } else {
            descEl.createSpan({
                text: '⚠ Elysium not detected - using default settings (Single File mode)',
                cls: 'opentime-status-warning'
            });
        }
    }

    /**
     * Open native folder picker dialog
     */
    private async selectFolder(): Promise<string | null> {
        try {
            // Access Electron's dialog through various possible paths
            let dialog: any = null;

            // Try different ways to access Electron dialog
            try {
                // Method 1: @electron/remote (modern Electron)
                const remote = require('@electron/remote');
                dialog = remote.dialog;
            } catch {
                try {
                    // Method 2: electron.remote (older Electron)
                    const electron = require('electron');
                    dialog = electron.remote?.dialog;
                } catch {
                    // Method 3: Direct electron access
                    try {
                        const electron = require('electron');
                        dialog = electron.dialog;
                    } catch {
                        // No dialog available
                    }
                }
            }

            if (!dialog) {
                // Fallback: enable manual text entry
                new Notice('Folder picker not available. Please enter the path manually.');
                return null;
            }

            const os = require('os');
            const defaultPath = this.plugin.settings.elysiumFolderPath ||
                `${os.homedir()}/Documents`;

            const result = await dialog.showOpenDialog({
                title: 'Select Elysium OpenTime Folder',
                properties: ['openDirectory', 'createDirectory'],
                defaultPath: defaultPath
            });

            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
        } catch (error) {
            console.error('[OpenTime] Failed to open folder picker:', error);
            new Notice('Failed to open folder picker. Please enter the path manually.');
        }
        return null;
    }
}
