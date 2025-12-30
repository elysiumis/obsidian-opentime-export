/**
 * Settings Tab for OpenTime Export Plugin
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import OpenTimeExportPlugin from '../main';

export interface OpenTimeExportSettings {
    // Export location
    exportPath: string;
    exportFilename: string;

    // Parsers to enable
    enableTasksParser: boolean;
    enableDayPlannerParser: boolean;
    enableFrontmatterParser: boolean;

    // Scope
    includeFolders: string;  // Comma-separated
    excludeFolders: string;  // Comma-separated

    // Behavior
    defaultTimezone: string;
    defaultEventDuration: number;
    autoExport: boolean;

    // ID generation
    idPrefix: string;

    // Elysium Direct Export
    elysiumFolderEnabled: boolean;
    elysiumFolderPath: string;

    // Obsidian Linking Defaults
    defaultVaultName: string;
    defaultObsidianBehavior: 'replace' | 'alongside';
    insertMarkdownByDefault: boolean;
}

export const DEFAULT_SETTINGS: OpenTimeExportSettings = {
    exportPath: '',
    exportFilename: 'obsidian-calendar.ot',
    enableTasksParser: true,
    enableDayPlannerParser: true,
    enableFrontmatterParser: true,
    includeFolders: '',
    excludeFolders: '',
    defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    defaultEventDuration: 30,
    autoExport: false,
    idPrefix: 'obs',
    // Elysium integration defaults
    elysiumFolderEnabled: false,
    elysiumFolderPath: '',
    defaultVaultName: '',
    defaultObsidianBehavior: 'replace',
    insertMarkdownByDefault: false
};

export class OpenTimeExportSettingTab extends PluginSettingTab {
    plugin: OpenTimeExportPlugin;

    constructor(app: App, plugin: OpenTimeExportPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'OpenTime Export Settings' });

        // Export Location Section
        containerEl.createEl('h3', { text: 'Export Location' });

        new Setting(containerEl)
            .setName('Export path')
            .setDesc('Folder path within vault to save .ot files (leave empty for vault root)')
            .addText(text => text
                .setPlaceholder('exports')
                .setValue(this.plugin.settings.exportPath)
                .onChange(async (value) => {
                    this.plugin.settings.exportPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Export filename')
            .setDesc('Name of the exported .ot file')
            .addText(text => text
                .setPlaceholder('obsidian-calendar.ot')
                .setValue(this.plugin.settings.exportFilename)
                .onChange(async (value) => {
                    this.plugin.settings.exportFilename = value || 'obsidian-calendar.ot';
                    await this.plugin.saveSettings();
                }));

        // Parsers Section
        containerEl.createEl('h3', { text: 'Data Sources' });

        new Setting(containerEl)
            .setName('Parse Tasks plugin format')
            .setDesc('Extract tasks with emoji dates (📅, ⏳, 🛫, ✅)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTasksParser)
                .onChange(async (value) => {
                    this.plugin.settings.enableTasksParser = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Parse Day Planner format')
            .setDesc('Extract time blocks (09:00 - 10:00 Meeting)')
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

        // Advanced Section
        containerEl.createEl('h3', { text: 'Advanced' });

        new Setting(containerEl)
            .setName('ID prefix')
            .setDesc('Prefix for generated item IDs')
            .addText(text => text
                .setPlaceholder('obs')
                .setValue(this.plugin.settings.idPrefix)
                .onChange(async (value) => {
                    this.plugin.settings.idPrefix = value || 'obs';
                    await this.plugin.saveSettings();
                }));

        // Elysium Integration Section
        containerEl.createEl('h3', { text: 'Elysium Integration' });
        containerEl.createEl('p', {
            text: 'Configure direct export to Elysium and Obsidian linking.',
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName('Export directly to Elysium folder')
            .setDesc('Write .ot files to Elysium\'s watched OpenTime folder')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.elysiumFolderEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.elysiumFolderEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Elysium OpenTime folder')
            .setDesc('Full path to the folder where Elysium watches for .ot files')
            .addText(text => text
                .setPlaceholder('/Users/you/Documents/OpenTime')
                .setValue(this.plugin.settings.elysiumFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.elysiumFolderPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Vault name')
            .setDesc('How this vault appears in Elysium (for "Open in Obsidian" links)')
            .addText(text => text
                .setPlaceholder('Personal')
                .setValue(this.plugin.settings.defaultVaultName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultVaultName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default behavior')
            .setDesc('How Elysium handles notes when opening from an item')
            .addDropdown(dropdown => dropdown
                .addOption('replace', 'Replace notes - Open Obsidian instead of Elysium notes')
                .addOption('alongside', 'Show alongside - Show both Elysium and Obsidian notes')
                .setValue(this.plugin.settings.defaultObsidianBehavior)
                .onChange(async (value: 'replace' | 'alongside') => {
                    this.plugin.settings.defaultObsidianBehavior = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Insert markdown by default')
            .setDesc('When creating items, also insert markdown into the current note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.insertMarkdownByDefault)
                .onChange(async (value) => {
                    this.plugin.settings.insertMarkdownByDefault = value;
                    await this.plugin.saveSettings();
                }));
    }
}
