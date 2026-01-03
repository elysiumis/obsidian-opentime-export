/**
 * Parser for Obsidian Tasks plugin format
 *
 * Supports:
 * - [ ] Task text 📅 2025-01-15
 * - [x] Completed task ✅ 2025-01-10
 * - [ ] Scheduled task ⏳ 2025-01-20 🛫 2025-01-18
 */

import { TFile } from 'obsidian';
import { TaskItem, generateId } from '../types/opentime';

interface ParsedTask {
    title: string;
    completed: boolean;
    dueDate?: string;
    scheduledDate?: string;
    startDate?: string;
    doneDate?: string;
    priority?: number;
    tags?: string[];
    lineNumber: number;
    originalText: string;
}

// Emoji patterns used by Tasks plugin
const EMOJI_PATTERNS = {
    due: /📅\s*(\d{4}-\d{2}-\d{2})/,
    scheduled: /⏳\s*(\d{4}-\d{2}-\d{2})/,
    start: /🛫\s*(\d{4}-\d{2}-\d{2})/,
    done: /✅\s*(\d{4}-\d{2}-\d{2})/,
    created: /➕\s*(\d{4}-\d{2}-\d{2})/,
    recurring: /🔁\s*([^\s]+)/,
    priority: {
        high: /[⏫🔺]/u,
        medium: /[🔼]/u,
        low: /[🔽⏬]/u
    }
};

// Task checkbox pattern
const TASK_PATTERN = /^(\s*)-\s*\[([ xX])\]\s*(.+)$/;

export class TasksParser {
    private idPrefix: string;

    constructor(idPrefix: string = 'obs') {
        this.idPrefix = idPrefix;
    }

    /**
     * Parse a markdown file for tasks
     */
    parseFile(content: string, file: TFile): TaskItem[] {
        const lines = content.split('\n');
        const tasks: TaskItem[] = [];

        lines.forEach((line, index) => {
            const parsed = this.parseLine(line, index + 1);
            if (parsed) {
                tasks.push(this.toOpenTimeTask(parsed, file));
            }
        });

        return tasks;
    }

    /**
     * Parse a single line for task content
     */
    private parseLine(line: string, lineNumber: number): ParsedTask | null {
        const match = line.match(TASK_PATTERN);
        if (!match) return null;

        const [, , checkbox, content] = match;
        const completed = checkbox.toLowerCase() === 'x';

        // Extract dates
        const dueMatch = content.match(EMOJI_PATTERNS.due);
        const scheduledMatch = content.match(EMOJI_PATTERNS.scheduled);
        const startMatch = content.match(EMOJI_PATTERNS.start);
        const doneMatch = content.match(EMOJI_PATTERNS.done);

        // Determine priority
        let priority: number | undefined;
        if (EMOJI_PATTERNS.priority.high.test(content)) {
            priority = 9;
        } else if (EMOJI_PATTERNS.priority.medium.test(content)) {
            priority = 5;
        } else if (EMOJI_PATTERNS.priority.low.test(content)) {
            priority = 1;
        }

        // Extract tags (Obsidian style #tag)
        const tagPattern = /#([a-zA-Z0-9_-]+)/g;
        const tags: string[] = [];
        let tagMatch;
        while ((tagMatch = tagPattern.exec(content)) !== null) {
            tags.push(tagMatch[1]);
        }

        // Clean up title - remove emojis and dates
        const title = content
            .replace(EMOJI_PATTERNS.due, '')
            .replace(EMOJI_PATTERNS.scheduled, '')
            .replace(EMOJI_PATTERNS.start, '')
            .replace(EMOJI_PATTERNS.done, '')
            .replace(EMOJI_PATTERNS.created, '')
            .replace(EMOJI_PATTERNS.recurring, '')
            .replace(EMOJI_PATTERNS.priority.high, '')
            .replace(EMOJI_PATTERNS.priority.medium, '')
            .replace(EMOJI_PATTERNS.priority.low, '')
            .replace(/#[a-zA-Z0-9_-]+/g, '')
            .trim();

        return {
            title,
            completed,
            dueDate: dueMatch?.[1],
            scheduledDate: scheduledMatch?.[1],
            startDate: startMatch?.[1],
            doneDate: doneMatch?.[1],
            priority,
            tags: tags.length > 0 ? tags : undefined,
            lineNumber,
            originalText: line
        };
    }

    /**
     * Convert parsed task to OpenTime format
     */
    private toOpenTimeTask(parsed: ParsedTask, file: TFile): TaskItem {
        return {
            type: 'task',
            id: generateId(this.idPrefix + '_task', parsed.title),
            title: parsed.title,
            status: parsed.completed ? 'done' : 'todo',
            due: parsed.dueDate,
            scheduled_start: parsed.scheduledDate ? `${parsed.scheduledDate}T09:00:00` : undefined,
            priority: parsed.priority,
            tags: parsed.tags,
            x_obsidian: {
                source_file: file.path,
                line_number: parsed.lineNumber,
                original_text: parsed.originalText
            }
        };
    }
}
