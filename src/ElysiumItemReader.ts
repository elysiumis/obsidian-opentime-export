/**
 * Elysium Item Reader
 *
 * Reads and parses .ot files from the Elysium OpenTime folder
 * to get existing items for linking.
 */

import { OpenTimeDocument, OpenTimeItem } from './types/opentime';
import * as yaml from 'js-yaml';

export interface ElysiumItemSummary {
    id: string;
    title: string;
    type: string;
    filename: string;
    filepath: string;
}

export class ElysiumItemReader {

    /**
     * Read all items from .ot files in the Elysium folder
     */
    async readAllItems(elysiumFolderPath: string): Promise<ElysiumItemSummary[]> {
        if (!elysiumFolderPath) {
            return [];
        }

        const fs = require('fs');
        const path = require('path');
        const items: ElysiumItemSummary[] = [];

        try {
            // Normalize path
            const normalizedPath = elysiumFolderPath.replace(/\/$/, '');

            if (!fs.existsSync(normalizedPath)) {
                console.log('[OpenTime] Elysium folder does not exist:', normalizedPath);
                return [];
            }

            // Get all .ot files
            const files = fs.readdirSync(normalizedPath) as string[];
            const otFiles = files.filter((f: string) => f.endsWith('.ot'));

            for (const filename of otFiles) {
                const filepath = path.join(normalizedPath, filename);
                try {
                    const content = fs.readFileSync(filepath, 'utf8');
                    const doc = yaml.load(content) as OpenTimeDocument;

                    if (doc && doc.items) {
                        for (const item of doc.items) {
                            items.push({
                                id: item.id,
                                title: item.title,
                                type: item.type,
                                filename: filename,
                                filepath: filepath
                            });
                        }
                    }
                } catch (parseError) {
                    console.warn(`[OpenTime] Failed to parse ${filename}:`, parseError);
                }
            }

            return items;
        } catch (error) {
            console.error('[OpenTime] Failed to read Elysium folder:', error);
            return [];
        }
    }

    /**
     * Read a specific .ot file and return its document
     */
    async readDocument(filepath: string): Promise<OpenTimeDocument | null> {
        const fs = require('fs');

        try {
            if (!fs.existsSync(filepath)) {
                return null;
            }

            const content = fs.readFileSync(filepath, 'utf8');
            return yaml.load(content) as OpenTimeDocument;
        } catch (error) {
            console.error('[OpenTime] Failed to read document:', error);
            return null;
        }
    }

    /**
     * Update an item in its .ot file to add Obsidian linking info
     */
    async linkItemToObsidian(
        filepath: string,
        itemId: string,
        obsidianInfo: {
            source_file: string;
            folder_path: string;
            vault_name: string;
            behavior: 'replace' | 'alongside';
        }
    ): Promise<boolean> {
        const fs = require('fs');

        try {
            // Read existing document
            const content = fs.readFileSync(filepath, 'utf8');
            const doc = yaml.load(content) as OpenTimeDocument;

            if (!doc || !doc.items) {
                return false;
            }

            // Find the item and update it
            let found = false;
            for (const item of doc.items) {
                if (item.id === itemId) {
                    // Add x_elysium extension with Obsidian link
                    item.x_elysium = {
                        obsidian_enabled: true,
                        obsidian_vault_name: obsidianInfo.vault_name,
                        obsidian_folder_path: obsidianInfo.folder_path,
                        obsidian_source_file: obsidianInfo.source_file,
                        obsidian_behavior: obsidianInfo.behavior
                    };
                    found = true;
                    break;
                }
            }

            if (!found) {
                return false;
            }

            // Write back using proper YAML formatting
            const yamlContent = this.serializeDocument(doc);
            fs.writeFileSync(filepath, yamlContent, 'utf8');

            return true;
        } catch (error) {
            console.error('[OpenTime] Failed to link item:', error);
            return false;
        }
    }

    /**
     * Serialize document back to YAML with proper formatting
     */
    private serializeDocument(doc: OpenTimeDocument): string {
        const lines: string[] = [];

        lines.push('# OpenTime File');
        lines.push('# Modified by Obsidian OpenTime Export Plugin');
        lines.push('');
        lines.push(`opentime_version: "${doc.opentime_version || '0.2'}"`);
        if (doc.default_timezone) {
            lines.push(`default_timezone: "${doc.default_timezone}"`);
        }
        if (doc.generated_by) {
            lines.push(`generated_by: "${doc.generated_by}"`);
        }
        lines.push(`created_at: "${doc.created_at || new Date().toISOString()}"`);
        lines.push('');
        lines.push('items:');

        for (const item of doc.items) {
            lines.push(...this.serializeItem(item));
        }

        return lines.join('\n');
    }

    /**
     * Serialize a single item to YAML
     */
    private serializeItem(item: OpenTimeItem): string[] {
        const lines: string[] = [];
        const indent = '    ';

        lines.push(`  - type: ${item.type}`);
        lines.push(`${indent}id: ${this.quote(item.id)}`);
        lines.push(`${indent}title: ${this.quote(item.title)}`);

        // Type-specific fields
        switch (item.type) {
            case 'goal':
                lines.push(`${indent}kind: goal`);
                if (item.target_date) lines.push(`${indent}target_date: ${this.quote(item.target_date)}`);
                if (item.progress !== undefined) lines.push(`${indent}progress: ${item.progress}`);
                if (item.project_id) lines.push(`${indent}project_id: ${this.quote(item.project_id)}`);
                break;

            case 'task':
                lines.push(`${indent}status: ${item.status}`);
                if (item.due) lines.push(`${indent}due: ${this.quote(item.due)}`);
                if (item.scheduled_start) lines.push(`${indent}scheduled_start: ${this.quote(item.scheduled_start)}`);
                if (item.estimate_minutes) lines.push(`${indent}estimate_minutes: ${item.estimate_minutes}`);
                if (item.priority !== undefined) lines.push(`${indent}priority: ${item.priority}`);
                if (item.goal_id) lines.push(`${indent}goal_id: ${this.quote(item.goal_id)}`);
                if (item.project_id) lines.push(`${indent}project_id: ${this.quote(item.project_id)}`);
                break;

            case 'habit':
                if (item.pattern) {
                    lines.push(`${indent}pattern:`);
                    if (item.pattern.freq) lines.push(`${indent}  freq: ${item.pattern.freq}`);
                }
                if (item.goal_id) lines.push(`${indent}goal_id: ${this.quote(item.goal_id)}`);
                break;

            case 'reminder':
                lines.push(`${indent}time: ${this.quote(item.time)}`);
                if (item.repeat) lines.push(`${indent}repeat: ${this.quote(item.repeat)}`);
                break;

            case 'event':
                lines.push(`${indent}start: ${this.quote(item.start)}`);
                lines.push(`${indent}end: ${this.quote(item.end)}`);
                if (item.location) lines.push(`${indent}location: ${this.quote(item.location)}`);
                if (item.goal_id) lines.push(`${indent}goal_id: ${this.quote(item.goal_id)}`);
                break;

            case 'appointment':
                lines.push(`${indent}start: ${this.quote(item.start)}`);
                lines.push(`${indent}end: ${this.quote(item.end)}`);
                if (item.attendees) lines.push(`${indent}attendees: [${item.attendees.map(a => this.quote(a)).join(', ')}]`);
                if (item.location) lines.push(`${indent}location: ${this.quote(item.location)}`);
                break;

            case 'project':
                lines.push(`${indent}kind: project`);
                if (item.target_date) lines.push(`${indent}target_date: ${this.quote(item.target_date)}`);
                if (item.progress !== undefined) lines.push(`${indent}progress: ${item.progress}`);
                break;
        }

        // Common fields
        if (item.tags && item.tags.length > 0) {
            lines.push(`${indent}tags: [${item.tags.map(t => this.quote(t)).join(', ')}]`);
        }
        if (item.notes) {
            if (item.notes.includes('\n')) {
                lines.push(`${indent}notes: |`);
                for (const line of item.notes.split('\n')) {
                    lines.push(`${indent}  ${line}`);
                }
            } else {
                lines.push(`${indent}notes: ${this.quote(item.notes)}`);
            }
        }

        // x_obsidian extension
        if (item.x_obsidian) {
            lines.push(`${indent}x_obsidian:`);
            lines.push(`${indent}  source_file: ${this.quote(item.x_obsidian.source_file)}`);
            if (item.x_obsidian.folder_path) {
                lines.push(`${indent}  folder_path: ${this.quote(item.x_obsidian.folder_path)}`);
            }
        }

        // x_elysium extension (for Obsidian linking)
        if (item.x_elysium) {
            lines.push(`${indent}x_elysium:`);
            lines.push(`${indent}  obsidian_enabled: ${item.x_elysium.obsidian_enabled}`);
            if (item.x_elysium.obsidian_vault_name) {
                lines.push(`${indent}  obsidian_vault_name: ${this.quote(item.x_elysium.obsidian_vault_name)}`);
            }
            if (item.x_elysium.obsidian_folder_path) {
                lines.push(`${indent}  obsidian_folder_path: ${this.quote(item.x_elysium.obsidian_folder_path)}`);
            }
            if (item.x_elysium.obsidian_source_file) {
                lines.push(`${indent}  obsidian_source_file: ${this.quote(item.x_elysium.obsidian_source_file)}`);
            }
            if (item.x_elysium.obsidian_behavior) {
                lines.push(`${indent}  obsidian_behavior: ${item.x_elysium.obsidian_behavior}`);
            }
        }

        lines.push('');
        return lines;
    }

    private quote(value: string): string {
        const needsQuotes = /[:#\[\]{}|>&*?!,'"%@`]|^\s|\s$|^-\s|^$/;
        if (needsQuotes.test(value) || value.includes('\n')) {
            return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
        }
        return value;
    }
}
