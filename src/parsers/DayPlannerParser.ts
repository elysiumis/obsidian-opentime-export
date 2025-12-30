/**
 * Parser for Day Planner style time blocks
 *
 * Supports:
 * - 09:00 Team standup
 * - 10:00 - 12:00 Deep work on project
 * - 14:00 Client call
 */

import { TFile } from 'obsidian';
import { EventItem, generateId } from '../types/opentime';

interface ParsedTimeBlock {
    title: string;
    startTime: string;  // HH:MM
    endTime?: string;   // HH:MM
    lineNumber: number;
    originalText: string;
}

// Time block patterns
const TIME_RANGE_PATTERN = /^(\s*)-?\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(.+)$/;
const SINGLE_TIME_PATTERN = /^(\s*)-?\s*(\d{1,2}:\d{2})\s+(.+)$/;

export class DayPlannerParser {
    private idPrefix: string;
    private defaultDuration: number;  // minutes
    private defaultTimezone: string;

    constructor(
        idPrefix: string = 'obs',
        defaultDuration: number = 30,
        defaultTimezone: string = 'UTC'
    ) {
        this.idPrefix = idPrefix;
        this.defaultDuration = defaultDuration;
        this.defaultTimezone = defaultTimezone;
    }

    /**
     * Parse a markdown file for time blocks
     * @param content File content
     * @param file The file being parsed
     * @param date The date for the events (from frontmatter or filename)
     */
    parseFile(content: string, file: TFile, date?: string): EventItem[] {
        const lines = content.split('\n');
        const events: EventItem[] = [];

        // Try to extract date from filename if not provided
        const fileDate = date || this.extractDateFromFilename(file.basename);
        if (!fileDate) {
            // Can't create events without a date
            return events;
        }

        lines.forEach((line, index) => {
            const parsed = this.parseLine(line, index + 1);
            if (parsed) {
                events.push(this.toOpenTimeEvent(parsed, file, fileDate));
            }
        });

        return events;
    }

    /**
     * Extract date from filename like "2025-01-15" or "2025-01-15 Daily Note"
     */
    private extractDateFromFilename(filename: string): string | undefined {
        const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
        return match?.[1];
    }

    /**
     * Parse a single line for time block content
     */
    private parseLine(line: string, lineNumber: number): ParsedTimeBlock | null {
        // Try time range first (10:00 - 12:00 Meeting)
        const rangeMatch = line.match(TIME_RANGE_PATTERN);
        if (rangeMatch) {
            const [, , startTime, endTime, title] = rangeMatch;
            return {
                title: title.trim(),
                startTime: this.normalizeTime(startTime),
                endTime: this.normalizeTime(endTime),
                lineNumber,
                originalText: line
            };
        }

        // Try single time (09:00 Standup)
        const singleMatch = line.match(SINGLE_TIME_PATTERN);
        if (singleMatch) {
            const [, , startTime, title] = singleMatch;
            return {
                title: title.trim(),
                startTime: this.normalizeTime(startTime),
                lineNumber,
                originalText: line
            };
        }

        return null;
    }

    /**
     * Normalize time to HH:MM format
     */
    private normalizeTime(time: string): string {
        const [hours, minutes] = time.split(':');
        return `${hours.padStart(2, '0')}:${minutes}`;
    }

    /**
     * Add minutes to a time string
     */
    private addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(':').map(Number);
        const totalMinutes = h * 60 + m + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    }

    /**
     * Convert parsed time block to OpenTime event
     */
    private toOpenTimeEvent(parsed: ParsedTimeBlock, file: TFile, date: string): EventItem {
        const endTime = parsed.endTime || this.addMinutes(parsed.startTime, this.defaultDuration);

        return {
            type: 'event',
            id: generateId(this.idPrefix + '_ev', `${date}_${parsed.startTime}`),
            title: parsed.title,
            start: `${date}T${parsed.startTime}:00`,
            end: `${date}T${endTime}:00`,
            timezone: this.defaultTimezone,
            x_obsidian: {
                source_file: file.path,
                line_number: parsed.lineNumber,
                original_text: parsed.originalText
            }
        };
    }
}
