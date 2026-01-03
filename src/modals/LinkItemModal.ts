/**
 * Link Item Modal
 *
 * Shows a searchable list of existing Elysium items
 * to link the current note to.
 */

import { App, SuggestModal, Notice, TFile, FileSystemAdapter } from 'obsidian';
import { ElysiumItemReader, ElysiumItemSummary } from '../ElysiumItemReader';
import { OpenTimeExportSettings } from '../SettingsTab';

export class LinkItemModal extends SuggestModal<ElysiumItemSummary> {
    private items: ElysiumItemSummary[] = [];
    private itemReader: ElysiumItemReader;
    private settings: OpenTimeExportSettings;
    private currentFile: TFile | null;
    private vaultName: string;
    private vaultPath: string;

    constructor(
        app: App,
        settings: OpenTimeExportSettings,
        currentFile: TFile | null
    ) {
        super(app);
        this.settings = settings;
        this.currentFile = currentFile;
        this.itemReader = new ElysiumItemReader();

        // Get vault info
        this.vaultName = this.app.vault.getName();
        const adapter = this.app.vault.adapter;
        this.vaultPath = adapter instanceof FileSystemAdapter ? adapter.getBasePath() : '';

        this.setPlaceholder('Search for an Elysium item to link...');
        this.setInstructions([
            { command: '↑↓', purpose: 'To navigate' },
            { command: '↵', purpose: 'To select' },
            { command: 'esc', purpose: 'To dismiss' }
        ]);
    }

    onOpen(): void {
        super.onOpen();

        // Load items from Elysium folder
        if (!this.settings.elysiumFolderPath) {
            new Notice('Elysium folder not configured. Please set it in plugin settings.');
            this.close();
            return;
        }

        this.items = this.itemReader.readAllItems(this.settings.elysiumFolderPath);

        if (this.items.length === 0) {
            new Notice('No items found in Elysium folder');
            this.close();
            return;
        }

        // Trigger re-render with loaded items
        this.inputEl.dispatchEvent(new Event('input'));
    }

    getSuggestions(query: string): ElysiumItemSummary[] {
        const lowerQuery = query.toLowerCase();
        return this.items.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.type.toLowerCase().includes(lowerQuery) ||
            item.id.toLowerCase().includes(lowerQuery)
        );
    }

    renderSuggestion(item: ElysiumItemSummary, el: HTMLElement) {
        const container = el.createDiv({ cls: 'elysium-link-suggestion' });

        // Type badge
        const badge = container.createSpan({ cls: 'elysium-type-badge' });
        badge.setText(this.getTypeEmoji(item.type) + ' ' + item.type);

        // Title
        const title = container.createDiv({ cls: 'elysium-item-title' });
        title.setText(item.title);

        // ID (smaller)
        const id = container.createDiv({ cls: 'elysium-item-id' });
        id.setText(item.id);
    }

    onChooseSuggestion(item: ElysiumItemSummary): void {
        if (!this.currentFile) {
            new Notice('No active file to link');
            return;
        }

        // Link the item to this Obsidian note
        const success = this.itemReader.linkItemToObsidian(
            item.filepath,
            item.id,
            {
                source_file: this.currentFile.path,
                folder_path: this.vaultPath,
                vault_name: this.vaultName,
                behavior: 'alongside'
            }
        );

        if (success) {
            new Notice(`Linked "${item.title}" to ${this.currentFile.basename}`);
        } else {
            new Notice('Failed to link item');
        }
    }

    private getTypeEmoji(type: string): string {
        switch (type) {
            case 'goal': return '🎯';
            case 'task': return '✅';
            case 'habit': return '🔄';
            case 'reminder': return '⏰';
            case 'event': return '📅';
            case 'appointment': return '👥';
            case 'project': return '📁';
            default: return '📝';
        }
    }
}
