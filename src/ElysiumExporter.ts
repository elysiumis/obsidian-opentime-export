/**
 * Elysium Direct Exporter
 *
 * Exports OpenTime items directly to Elysium's watched folder
 * outside of the Obsidian vault.
 */

import { Notice } from 'obsidian';
import { OpenTimeDocument, OpenTimeItem } from './types/opentime';
import { OpenTimeExporter } from './OpenTimeExporter';
import { readElysiumPreferences } from './ElysiumPreferences';
import * as yaml from 'js-yaml';

// Node.js fs module types for Electron environment
interface NodeFS {
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: { recursive?: boolean }): void;
    readFileSync(path: string, encoding: string): string;
    writeFileSync(path: string, data: string, encoding: string): void;
    accessSync(path: string, mode: number): void;
    constants: { W_OK: number };
}

function getFs(): NodeFS | null {
     
    return window.require?.('fs') as NodeFS | null;
}

export class ElysiumExporter {
    private exporter: OpenTimeExporter;
    private pluginVersion: string;

    constructor(pluginVersion: string = '1.0.0') {
        this.pluginVersion = pluginVersion;
        this.exporter = new OpenTimeExporter(pluginVersion);
    }

    /**
     * Generate a sanitized filename for Elysium import
     * Format: elysium-[type]-[sanitized-title].ot
     * Must start with "elysium-" for Elysium's auto-import to detect it
     */
    private sanitizedFilename(title: string, type: string): string {
        // Lowercase and trim
        let sanitized = title.toLowerCase().trim();

        // Replace spaces and underscores with hyphens
        sanitized = sanitized.replace(/[\s_]+/g, '-');

        // Remove special characters (keep only alphanumeric and hyphens)
        sanitized = sanitized.replace(/[^a-z0-9-]/g, '');

        // Collapse multiple hyphens into one
        sanitized = sanitized.replace(/-+/g, '-');

        // Trim hyphens from start and end
        sanitized = sanitized.replace(/^-+|-+$/g, '');

        // Limit length to 50 characters
        if (sanitized.length > 50) {
            sanitized = sanitized.substring(0, 50).replace(/-+$/, '');
        }

        // Fallback if empty
        if (!sanitized) {
            sanitized = 'untitled';
        }

        return `elysium-${type.toLowerCase()}-${sanitized}.ot`;
    }

    /**
     * Export items based on Elysium's export mode preference
     * - Single File mode: merge into elysium-schedule.ot
     * - Per Item mode: create individual files
     */
    async exportItems(
        items: OpenTimeItem[],
        elysiumFolderPath: string,
        timezone: string
    ): Promise<boolean> {
        if (!elysiumFolderPath) {
            new Notice('Elysium folder not configured. Please set it in plugin settings.');
            return false;
        }

        const prefs = await readElysiumPreferences();

        if (prefs.exportMode === 'per-item') {
            return Promise.resolve(this.exportPerItem(items, elysiumFolderPath, timezone));
        } else {
            return Promise.resolve(this.exportSingleFile(items, elysiumFolderPath, timezone, prefs.singleFilename));
        }
    }

    /**
     * Single File mode: Merge items into existing file by ID
     * Updates existing items, adds new ones
     */
    private exportSingleFile(
        items: OpenTimeItem[],
        elysiumFolderPath: string,
        timezone: string,
        filename: string
    ): boolean {
        const fs = getFs();
        if (!fs) {
            new Notice('File system not available');
            return false;
        }

        const normalizedPath = elysiumFolderPath.replace(/\/$/, '');
        const fullPath = `${normalizedPath}/${filename}.ot`;

        try {
            // Ensure directory exists
            if (!fs.existsSync(normalizedPath)) {
                fs.mkdirSync(normalizedPath, { recursive: true });
            }

            // Read existing file if it exists
            let existingItems: OpenTimeItem[] = [];
            if (fs.existsSync(fullPath)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const existingDoc = yaml.load(content) as OpenTimeDocument;
                    if (existingDoc && existingDoc.items) {
                        existingItems = existingDoc.items;
                    }
                } catch (parseError) {
                    console.warn('[OpenTime] Failed to parse existing file, will overwrite:', parseError);
                }
            }

            // Merge: Update existing items by ID, add new ones
            const itemMap = new Map<string, OpenTimeItem>();

            // Add existing items first (preserve items not from Obsidian)
            for (const item of existingItems) {
                itemMap.set(item.id, item);
            }

            // Update/add new items from Obsidian (overwrites by ID)
            for (const item of items) {
                itemMap.set(item.id, item);
            }

            // Create merged document
            const document: OpenTimeDocument = {
                opentime_version: '0.2',
                default_timezone: timezone,
                generated_by: `Obsidian OpenTime Export ${this.pluginVersion}`,
                created_at: new Date().toISOString(),
                items: Array.from(itemMap.values())
            };

            // Write file
            const yamlContent = this.exporter.export(document);
            fs.writeFileSync(fullPath, yamlContent, 'utf8');

            new Notice(`Exported ${items.length} items to ${filename}.ot`);
            return true;

        } catch (error) {
            console.error('[OpenTime] Failed to export single file:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to export: ${message}`);
            return false;
        }
    }

    /**
     * Per Item mode: Create individual files for each item
     */
    private exportPerItem(
        items: OpenTimeItem[],
        elysiumFolderPath: string,
        timezone: string
    ): boolean {
        let successCount = 0;

        for (const item of items) {
            const success = this.exportItem(item, elysiumFolderPath, timezone);
            if (success) successCount++;
        }

        if (successCount === items.length) {
            new Notice(`Exported ${successCount} items to Elysium`);
            return true;
        } else if (successCount > 0) {
            new Notice(`Exported ${successCount}/${items.length} items (some failed)`);
            return true;
        } else {
            new Notice('Failed to export items');
            return false;
        }
    }

    /**
     * Export a single item to Elysium's OpenTime folder
     * Creates an .ot file with Elysium-compatible naming
     */
    exportItem(
        item: OpenTimeItem,
        elysiumFolderPath: string,
        timezone: string
    ): boolean {
        const document: OpenTimeDocument = {
            opentime_version: '0.2',
            default_timezone: timezone,
            generated_by: `Obsidian OpenTime Export ${this.pluginVersion}`,
            created_at: new Date().toISOString(),
            items: [item]
        };

        const filename = this.sanitizedFilename(item.title, item.type);
        return this.exportDocument(document, elysiumFolderPath, filename);
    }

    /**
     * Export a full document to Elysium's OpenTime folder
     */
    exportDocument(
        document: OpenTimeDocument,
        elysiumFolderPath: string,
        filename: string
    ): boolean {
        try {
            // Validate folder path
            if (!elysiumFolderPath) {
                new Notice('Elysium folder path not configured. Please set it in plugin settings.');
                return false;
            }

            // Normalize path
            const normalizedPath = elysiumFolderPath.replace(/\/$/, '');
            const fullPath = `${normalizedPath}/${filename}`;

            // Serialize document
            const yamlContent = this.exporter.export(document);

            // Use Node.js fs module via Electron
            const fs = getFs();
            if (!fs) {
                new Notice('File system not available');
                return false;
            }

            // Ensure directory exists
            if (!fs.existsSync(normalizedPath)) {
                fs.mkdirSync(normalizedPath, { recursive: true });
            }

            // Write file
            fs.writeFileSync(fullPath, yamlContent, 'utf8');

            return true;
        } catch (error) {
            console.error('[OpenTime] Failed to export to Elysium folder:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to export to Elysium: ${message}`);
            return false;
        }
    }

    /**
     * Check if the Elysium folder is accessible
     */
    checkFolderAccess(elysiumFolderPath: string): boolean {
        try {
            const fs = getFs();
            if (!fs) return false;

            if (!elysiumFolderPath) {
                return false;
            }

            // Try to access the folder
            if (fs.existsSync(elysiumFolderPath)) {
                fs.accessSync(elysiumFolderPath, fs.constants.W_OK);
                return true;
            }

            // Try to create it
            fs.mkdirSync(elysiumFolderPath, { recursive: true });
            return true;
        } catch {
            return false;
        }
    }
}
