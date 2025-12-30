/**
 * Parser for YAML frontmatter with calendar/task fields
 *
 * Supports:
 * ---
 * date: 2025-01-15
 * due: 2025-01-20
 * type: task
 * status: todo
 * ---
 */

import { TFile, parseYaml } from 'obsidian';
import {
    OpenTimeItem,
    TaskItem,
    EventItem,
    GoalItem,
    HabitItem,
    generateId,
    TaskStatus
} from '../types/opentime';

interface ParsedFrontmatter {
    // Common fields
    type?: string;
    title?: string;
    tags?: string[];
    notes?: string;

    // Task fields
    status?: string;
    due?: string;
    scheduled?: string;
    priority?: number;

    // Event fields
    date?: string;
    start?: string;
    end?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    location?: string;

    // Goal fields
    target_date?: string;
    progress?: number;

    // Habit fields
    frequency?: string;

    // Allow any other fields
    [key: string]: unknown;
}

export class FrontmatterParser {
    private idPrefix: string;
    private defaultTimezone: string;

    constructor(
        idPrefix: string = 'obs',
        defaultTimezone: string = 'UTC'
    ) {
        this.idPrefix = idPrefix;
        this.defaultTimezone = defaultTimezone;
    }

    /**
     * Parse frontmatter from file content
     */
    parseFile(content: string, file: TFile): OpenTimeItem | null {
        const frontmatter = this.extractFrontmatter(content);
        if (!frontmatter) return null;

        // Determine type from frontmatter or infer from fields
        const type = this.determineType(frontmatter);
        if (!type) return null;

        // Get title from frontmatter or filename
        const title = frontmatter.title as string || file.basename;

        switch (type) {
            case 'task':
                return this.toTask(frontmatter, title, file);
            case 'event':
                return this.toEvent(frontmatter, title, file);
            case 'goal':
                return this.toGoal(frontmatter, title, file);
            case 'habit':
                return this.toHabit(frontmatter, title, file);
            default:
                return null;
        }
    }

    /**
     * Extract and parse YAML frontmatter
     */
    private extractFrontmatter(content: string): ParsedFrontmatter | null {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;

        try {
            return parseYaml(match[1]) as ParsedFrontmatter;
        } catch {
            return null;
        }
    }

    /**
     * Determine item type from frontmatter fields
     */
    private determineType(fm: ParsedFrontmatter): string | null {
        // Explicit type
        if (fm.type) {
            return fm.type.toLowerCase();
        }

        // Infer from fields
        if (fm.due || fm.status) {
            return 'task';
        }
        if (fm.start && fm.end) {
            return 'event';
        }
        if (fm.date && (fm.startTime || fm.endTime)) {
            return 'event';
        }
        if (fm.target_date || fm.progress !== undefined) {
            return 'goal';
        }
        if (fm.frequency) {
            return 'habit';
        }

        return null;
    }

    /**
     * Convert to OpenTime task
     */
    private toTask(fm: ParsedFrontmatter, title: string, file: TFile): TaskItem {
        const statusMap: Record<string, TaskStatus> = {
            'todo': 'todo',
            'in_progress': 'in_progress',
            'in-progress': 'in_progress',
            'inprogress': 'in_progress',
            'done': 'done',
            'complete': 'done',
            'completed': 'done',
            'cancelled': 'cancelled',
            'canceled': 'cancelled'
        };

        return {
            type: 'task',
            id: generateId(this.idPrefix + '_task', title),
            title,
            status: statusMap[fm.status?.toLowerCase() || ''] || 'todo',
            due: fm.due,
            scheduled_start: fm.scheduled,
            priority: fm.priority,
            tags: fm.tags,
            notes: fm.notes,
            x_obsidian: {
                source_file: file.path
            }
        };
    }

    /**
     * Convert to OpenTime event
     */
    private toEvent(fm: ParsedFrontmatter, title: string, file: TFile): EventItem {
        let start: string;
        let end: string;

        if (fm.start && fm.end) {
            // Full datetime provided
            start = fm.start;
            end = fm.end;
        } else if (fm.date) {
            // Date with optional times
            const startTime = fm.startTime || '09:00';
            const endTime = fm.endTime || '10:00';
            start = `${fm.date}T${startTime}:00`;
            end = `${fm.date}T${endTime}:00`;
        } else {
            // Fallback - shouldn't reach here
            start = new Date().toISOString();
            end = new Date().toISOString();
        }

        return {
            type: 'event',
            id: generateId(this.idPrefix + '_ev', title),
            title,
            start,
            end,
            all_day: fm.allDay,
            location: fm.location,
            timezone: this.defaultTimezone,
            tags: fm.tags,
            notes: fm.notes,
            x_obsidian: {
                source_file: file.path
            }
        };
    }

    /**
     * Convert to OpenTime goal
     */
    private toGoal(fm: ParsedFrontmatter, title: string, file: TFile): GoalItem {
        return {
            type: 'goal',
            kind: 'goal',
            id: generateId(this.idPrefix + '_goal', title),
            title,
            target_date: fm.target_date,
            progress: fm.progress,
            tags: fm.tags,
            notes: fm.notes,
            x_obsidian: {
                source_file: file.path
            }
        };
    }

    /**
     * Convert to OpenTime habit
     */
    private toHabit(fm: ParsedFrontmatter, title: string, file: TFile): HabitItem {
        const freqMap: Record<string, 'daily' | 'weekly' | 'custom'> = {
            'daily': 'daily',
            'weekly': 'weekly',
            'custom': 'custom'
        };

        return {
            type: 'habit',
            id: generateId(this.idPrefix + '_habit', title),
            title,
            pattern: fm.frequency ? { freq: freqMap[fm.frequency.toLowerCase()] || 'daily' } : undefined,
            tags: fm.tags,
            notes: fm.notes,
            x_obsidian: {
                source_file: file.path
            }
        };
    }
}
