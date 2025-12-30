/**
 * Elysium Direct Exporter
 *
 * Exports OpenTime items directly to Elysium's watched folder
 * outside of the Obsidian vault.
 */

import { Notice } from 'obsidian';
import { OpenTimeDocument, OpenTimeItem } from './types/opentime';
import { OpenTimeExporter } from './OpenTimeExporter';

export class ElysiumExporter {
    private exporter: OpenTimeExporter;
    private pluginVersion: string;

    constructor(pluginVersion: string = '1.0.0') {
        this.pluginVersion = pluginVersion;
        this.exporter = new OpenTimeExporter(pluginVersion);
    }

    /**
     * Export a single item to Elysium's OpenTime folder
     * Creates or appends to an .ot file in the specified folder
     */
    async exportItem(
        item: OpenTimeItem,
        elysiumFolderPath: string,
        timezone: string
    ): Promise<boolean> {
        const document: OpenTimeDocument = {
            opentime_version: '0.2',
            default_timezone: timezone,
            generated_by: `Obsidian OpenTime Export ${this.pluginVersion}`,
            created_at: new Date().toISOString(),
            items: [item]
        };

        return this.exportDocument(document, elysiumFolderPath, `obsidian-${item.type}-${Date.now()}.ot`);
    }

    /**
     * Export a full document to Elysium's OpenTime folder
     */
    async exportDocument(
        document: OpenTimeDocument,
        elysiumFolderPath: string,
        filename: string
    ): Promise<boolean> {
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
            const yaml = this.exporter.export(document);

            // Use Node.js fs module via Electron
            const fs = require('fs');
            const path = require('path');

            // Ensure directory exists
            if (!fs.existsSync(normalizedPath)) {
                fs.mkdirSync(normalizedPath, { recursive: true });
            }

            // Write file
            fs.writeFileSync(fullPath, yaml, 'utf8');

            new Notice(`Exported to Elysium: ${filename}`);
            return true;
        } catch (error) {
            console.error('Failed to export to Elysium folder:', error);
            new Notice(`Failed to export to Elysium: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if the Elysium folder is accessible
     */
    checkFolderAccess(elysiumFolderPath: string): boolean {
        try {
            const fs = require('fs');

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
