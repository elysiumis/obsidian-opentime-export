/**
 * OpenTime Export Plugin for Obsidian
 *
 * Exports calendar-related content (tasks, events, habits) to
 * Elysium's OpenTime (.ot) format.
 */

import {
    App,
    Plugin,
    TFile,
    TFolder,
    Notice,
    normalizePath,
    MarkdownView
} from 'obsidian';

import { OpenTimeDocument, OpenTimeItem, OpenTimeItemType } from './src/types/opentime';
import { CreateItemModal } from './src/modals/CreateItemModal';
import { TasksParser, DayPlannerParser, FrontmatterParser } from './src/parsers';
import { OpenTimeExporter } from './src/OpenTimeExporter';
import {
    OpenTimeExportSettings,
    OpenTimeExportSettingTab,
    DEFAULT_SETTINGS
} from './src/SettingsTab';

export default class OpenTimeExportPlugin extends Plugin {
    settings: OpenTimeExportSettings;

    private tasksParser: TasksParser;
    private dayPlannerParser: DayPlannerParser;
    private frontmatterParser: FrontmatterParser;
    private exporter: OpenTimeExporter;

    async onload() {
        await this.loadSettings();

        // Initialize parsers
        this.initializeParsers();

        // Initialize exporter
        this.exporter = new OpenTimeExporter(this.manifest.version);

        // Add ribbon icon
        this.addRibbonIcon('calendar-clock', 'Export to OpenTime', async () => {
            await this.exportAll();
        });

        // Add commands
        this.addCommand({
            id: 'export-all',
            name: 'Export all to OpenTime',
            callback: async () => {
                await this.exportAll();
            }
        });

        this.addCommand({
            id: 'export-current-file',
            name: 'Export current file to OpenTime',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) {
                        this.exportFile(file);
                    }
                    return true;
                }
                return false;
            }
        });

        // Create item commands - one for each type
        this.addCommand({
            id: 'create-item',
            name: 'Create item for Elysium',
            callback: () => {
                this.openCreateModal(null);
            }
        });

        this.addCommand({
            id: 'create-goal',
            name: 'Create goal for Elysium',
            callback: () => {
                this.openCreateModal('goal');
            }
        });

        this.addCommand({
            id: 'create-task',
            name: 'Create task for Elysium',
            callback: () => {
                this.openCreateModal('task');
            }
        });

        this.addCommand({
            id: 'create-habit',
            name: 'Create habit for Elysium',
            callback: () => {
                this.openCreateModal('habit');
            }
        });

        this.addCommand({
            id: 'create-reminder',
            name: 'Create reminder for Elysium',
            callback: () => {
                this.openCreateModal('reminder');
            }
        });

        this.addCommand({
            id: 'create-event',
            name: 'Create event for Elysium',
            callback: () => {
                this.openCreateModal('event');
            }
        });

        this.addCommand({
            id: 'create-appointment',
            name: 'Create appointment for Elysium',
            callback: () => {
                this.openCreateModal('appointment');
            }
        });

        this.addCommand({
            id: 'create-project',
            name: 'Create project for Elysium',
            callback: () => {
                this.openCreateModal('project');
            }
        });

        // Add settings tab
        this.addSettingTab(new OpenTimeExportSettingTab(this.app, this));

        // Auto-export on save if enabled
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.settings.autoExport && file instanceof TFile && file.extension === 'md') {
                    await this.exportAll();
                }
            })
        );

        console.log('OpenTime Export plugin loaded');
    }

    onunload() {
        console.log('OpenTime Export plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.initializeParsers();  // Reinitialize with new settings
    }

    /**
     * Initialize parsers with current settings
     */
    private initializeParsers() {
        this.tasksParser = new TasksParser(this.settings.idPrefix);
        this.dayPlannerParser = new DayPlannerParser(
            this.settings.idPrefix,
            this.settings.defaultEventDuration,
            this.settings.defaultTimezone
        );
        this.frontmatterParser = new FrontmatterParser(
            this.settings.idPrefix,
            this.settings.defaultTimezone
        );
    }

    /**
     * Export all matching files to OpenTime format
     */
    async exportAll() {
        const startTime = Date.now();
        const items: OpenTimeItem[] = [];

        // Get all markdown files
        const files = this.app.vault.getMarkdownFiles();

        // Filter by folder settings
        const filteredFiles = this.filterFiles(files);

        // Parse each file
        for (const file of filteredFiles) {
            const fileItems = await this.parseFile(file);
            items.push(...fileItems);
        }

        if (items.length === 0) {
            new Notice('No calendar items found to export');
            return;
        }

        // Create document
        const document: OpenTimeDocument = {
            opentime_version: '0.2',
            default_timezone: this.settings.defaultTimezone,
            items
        };

        // Export to file
        await this.writeExport(document);

        const elapsed = Date.now() - startTime;
        new Notice(`Exported ${items.length} items to OpenTime (${elapsed}ms)`);
    }

    /**
     * Export a single file
     */
    async exportFile(file: TFile) {
        const items = await this.parseFile(file);

        if (items.length === 0) {
            new Notice('No calendar items found in this file');
            return;
        }

        const document: OpenTimeDocument = {
            opentime_version: '0.2',
            default_timezone: this.settings.defaultTimezone,
            items
        };

        await this.writeExport(document);
        new Notice(`Exported ${items.length} items from ${file.basename}`);
    }

    /**
     * Filter files by include/exclude folder settings
     */
    private filterFiles(files: TFile[]): TFile[] {
        const includeFolders = this.settings.includeFolders
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);

        const excludeFolders = this.settings.excludeFolders
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);

        return files.filter(file => {
            // Check excludes first
            for (const exclude of excludeFolders) {
                if (file.path.startsWith(exclude + '/') || file.path === exclude) {
                    return false;
                }
            }

            // If no includes specified, include all
            if (includeFolders.length === 0) {
                return true;
            }

            // Check includes
            for (const include of includeFolders) {
                if (file.path.startsWith(include + '/') || file.path === include) {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Parse a file for OpenTime items
     */
    private async parseFile(file: TFile): Promise<OpenTimeItem[]> {
        const content = await this.app.vault.read(file);
        const items: OpenTimeItem[] = [];

        // Extract date from frontmatter for Day Planner parser
        let fileDate: string | undefined;
        const frontmatterMatch = content.match(/^---\n[\s\S]*?date:\s*(\d{4}-\d{2}-\d{2})[\s\S]*?\n---/);
        if (frontmatterMatch) {
            fileDate = frontmatterMatch[1];
        }

        // Parse with enabled parsers
        if (this.settings.enableTasksParser) {
            items.push(...this.tasksParser.parseFile(content, file));
        }

        if (this.settings.enableDayPlannerParser) {
            items.push(...this.dayPlannerParser.parseFile(content, file, fileDate));
        }

        if (this.settings.enableFrontmatterParser) {
            const frontmatterItem = this.frontmatterParser.parseFile(content, file);
            if (frontmatterItem) {
                items.push(frontmatterItem);
            }
        }

        return items;
    }

    /**
     * Write the export to a file
     */
    private async writeExport(document: OpenTimeDocument) {
        const yaml = this.exporter.export(document);

        // Determine output path
        let outputPath = this.settings.exportFilename;
        if (this.settings.exportPath) {
            outputPath = normalizePath(`${this.settings.exportPath}/${this.settings.exportFilename}`);

            // Ensure folder exists
            const folder = this.app.vault.getAbstractFileByPath(this.settings.exportPath);
            if (!folder) {
                await this.app.vault.createFolder(this.settings.exportPath);
            }
        }

        // Write or update file
        const existing = this.app.vault.getAbstractFileByPath(outputPath);
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, yaml);
        } else {
            await this.app.vault.create(outputPath, yaml);
        }
    }

    /**
     * Open the create item modal
     */
    private openCreateModal(itemType: OpenTimeItemType | null) {
        // Get selected text if any
        let initialText = '';
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
            initialText = activeView.editor.getSelection();
        }

        const modal = new CreateItemModal(
            this.app,
            this.settings,
            this.manifest.version,
            itemType,
            initialText
        );
        modal.open();
    }
}
