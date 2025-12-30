/**
 * OpenTime Format v0.2 TypeScript Types
 * The Markdown of Time - A human-readable, app-agnostic format for schedules
 */

export type OpenTimeItemType = 'goal' | 'task' | 'habit' | 'reminder' | 'event' | 'appointment' | 'project';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface OpenTimeLink {
    kind: 'url' | 'ref';
    value: string;
}

export interface HabitPattern {
    freq?: HabitFrequency;
    days_of_week?: DayOfWeek[];
}

export interface HabitWindow {
    start_time?: string;  // HH:MM format
    end_time?: string;    // HH:MM format
}

export interface HabitStreak {
    current?: number;
    longest?: number;
}

export interface ObsidianExtension {
    source_file: string;
    line_number?: number;
    original_text?: string;
    vault_name?: string;
}

export interface ElysiumExtension {
    obsidian_enabled: boolean;
    obsidian_vault_name?: string;
    obsidian_folder_path?: string;
    obsidian_behavior?: 'replace' | 'alongside';
}

// Base fields common to all items
interface BaseItem {
    type: OpenTimeItemType;
    id: string;
    title: string;
    tags?: string[];
    notes?: string;
    links?: OpenTimeLink[];
    x_obsidian?: ObsidianExtension;
    x_elysium?: ElysiumExtension;
    [key: string]: unknown;  // Allow other x_* extensions
}

export interface GoalItem extends BaseItem {
    type: 'goal';
    kind: 'goal';
    target_date?: string;  // YYYY-MM-DD
    progress?: number;     // 0.0 - 1.0
    project_id?: string;
}

export interface TaskItem extends BaseItem {
    type: 'task';
    status: TaskStatus;
    due?: string;             // YYYY-MM-DD
    scheduled_start?: string; // ISO8601 datetime
    estimate_minutes?: number;
    actual_minutes?: number;
    priority?: number;
    goal_id?: string;
    project_id?: string;
}

export interface HabitItem extends BaseItem {
    type: 'habit';
    pattern?: HabitPattern;
    window?: HabitWindow;
    streak?: HabitStreak;
    goal_id?: string;
    project_id?: string;
}

export interface ReminderItem extends BaseItem {
    type: 'reminder';
    time: string;       // ISO8601 datetime
    repeat?: string;    // RRULE format
    link?: string;      // Related item ID
}

export interface EventItem extends BaseItem {
    type: 'event';
    start: string;         // ISO8601 datetime
    end: string;           // ISO8601 datetime
    all_day?: boolean;
    timezone?: string;     // IANA timezone
    location?: string;
    recurrence?: string;   // RRULE format
    goal_id?: string;
    project_id?: string;
}

export interface AppointmentItem extends BaseItem {
    type: 'appointment';
    start: string;         // ISO8601 datetime
    end: string;           // ISO8601 datetime
    attendees: string[];
    location?: string;
    provider?: string;
    goal_id?: string;
    project_id?: string;
}

export interface ProjectItem extends BaseItem {
    type: 'project';
    kind: 'project';
    children?: string[];   // Item IDs
    progress?: number;     // 0.0 - 1.0
    target_date?: string;  // YYYY-MM-DD
}

export type OpenTimeItem =
    | GoalItem
    | TaskItem
    | HabitItem
    | ReminderItem
    | EventItem
    | AppointmentItem
    | ProjectItem;

export interface OpenTimeDocument {
    opentime_version: string;
    default_timezone?: string;
    generated_by?: string;
    created_at?: string;  // ISO8601 datetime
    items: OpenTimeItem[];
}

// Helper to create unique IDs
export function generateId(prefix: string, title: string): string {
    const sanitized = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);
    return `${prefix}_${sanitized}_${Date.now().toString(36)}`;
}

// Helper to format date as YYYY-MM-DD
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Helper to format as ISO8601 with timezone
export function formatDateTime(date: Date, timezone?: string): string {
    return date.toISOString();
}
