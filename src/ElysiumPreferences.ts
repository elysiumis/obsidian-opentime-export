/**
 * Elysium Preferences Reader
 *
 * Reads Elysium app preferences from macOS plist file
 * to sync export mode and filename settings.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type ExportMode = 'single' | 'per-item';

export interface ElysiumPreferences {
    exportMode: ExportMode;
    singleFilename: string; // e.g., "elysium-schedule" (without .ot extension)
    folderPath?: string;
}

export const DEFAULT_ELYSIUM_PREFS: ElysiumPreferences = {
    exportMode: 'single',
    singleFilename: 'elysium-schedule'
};

/**
 * Read Elysium preferences from macOS plist
 * Uses `defaults read` command which handles binary/XML plist automatically
 */
export async function readElysiumPreferences(): Promise<ElysiumPreferences> {
    const prefs: ElysiumPreferences = { ...DEFAULT_ELYSIUM_PREFS };

    try {
        // Read export mode
        try {
            const { stdout: modeOut } = await execAsync(
                'defaults read gingabox.Elysium "opentime.exportMode" 2>/dev/null'
            );
            const modeValue = modeOut.trim();
            prefs.exportMode = modeValue === 'Per Item' ? 'per-item' : 'single';
        } catch {
            // Key doesn't exist, use default
        }

        // Read single file filename
        try {
            const { stdout: filenameOut } = await execAsync(
                'defaults read gingabox.Elysium "opentime.filename" 2>/dev/null'
            );
            const filename = filenameOut.trim();
            if (filename) {
                prefs.singleFilename = filename;
            }
        } catch {
            // Key doesn't exist, use default
        }

        // Read folder path (optional, user may have set it in Elysium)
        try {
            const { stdout: pathOut } = await execAsync(
                'defaults read gingabox.Elysium "opentime.customPath" 2>/dev/null'
            );
            const folderPath = pathOut.trim();
            if (folderPath) {
                prefs.folderPath = folderPath;
            }
        } catch {
            // Key doesn't exist
        }

    } catch (error) {
        console.log('[OpenTime] Elysium preferences not found, using defaults');
    }

    return prefs;
}

/**
 * Check if Elysium is installed (plist exists)
 */
export async function isElysiumInstalled(): Promise<boolean> {
    try {
        await execAsync('defaults read gingabox.Elysium 2>/dev/null');
        return true;
    } catch {
        return false;
    }
}

/**
 * Get a human-readable description of the export mode
 */
export function getExportModeDescription(prefs: ElysiumPreferences): string {
    if (prefs.exportMode === 'per-item') {
        return 'Per Item (elysium-{type}-{title}.ot)';
    }
    return `Single File (${prefs.singleFilename}.ot)`;
}
