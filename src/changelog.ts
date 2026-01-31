import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getLocale } from './config.js';

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    type: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
    items: string[];
  }[];
}

export interface Changelog {
  entries: ChangelogEntry[];
}

function findChangelogPath(): string {
  // Get the directory of the current module
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  const locale = getLocale();
  const filename = locale === 'ja' ? 'CHANGELOG.ja.md' : 'CHANGELOG.md';
  const fallbackFilename = 'CHANGELOG.md';

  // Try to find localized CHANGELOG relative to the package root
  // From dist/ or src/, go up one level
  const basePaths = [
    join(currentDir, '..'),
    join(currentDir, '..', '..'),
    process.cwd(),
  ];

  // First, try to find the localized version
  for (const basePath of basePaths) {
    const localizedPath = join(basePath, filename);
    try {
      readFileSync(localizedPath, 'utf-8');
      return localizedPath;
    } catch {
      // continue to next path
    }
  }

  // Fall back to default CHANGELOG.md
  for (const basePath of basePaths) {
    const fallbackPath = join(basePath, fallbackFilename);
    try {
      readFileSync(fallbackPath, 'utf-8');
      return fallbackPath;
    } catch {
      // continue to next path
    }
  }

  return join(basePaths[0], fallbackFilename); // Return first path as fallback
}

export function parseChangelog(): Changelog {
  const changelogPath = findChangelogPath();

  let content: string;
  try {
    content = readFileSync(changelogPath, 'utf-8');
  } catch {
    return { entries: [] };
  }

  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');

  let currentEntry: ChangelogEntry | null = null;
  let currentSection: { type: string; items: string[] } | null = null;

  for (const line of lines) {
    // Match version header: ## [0.1.0] - 2025-01-29 or ## [Unreleased]
    const versionMatch = line.match(/^## \[([^\]]+)\](?:\s*-\s*(.+))?$/);
    if (versionMatch) {
      if (currentEntry) {
        if (currentSection && currentSection.items.length > 0) {
          currentEntry.sections.push(currentSection as ChangelogEntry['sections'][0]);
        }
        if (currentEntry.sections.length > 0 || currentEntry.version !== 'Unreleased') {
          entries.push(currentEntry);
        }
      }

      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() || '',
        sections: [],
      };
      currentSection = null;
      continue;
    }

    // Match section header: ### Added, ### Changed, etc.
    const sectionMatch = line.match(/^### (Added|Changed|Deprecated|Removed|Fixed|Security)$/);
    if (sectionMatch && currentEntry) {
      if (currentSection && currentSection.items.length > 0) {
        currentEntry.sections.push(currentSection as ChangelogEntry['sections'][0]);
      }
      currentSection = {
        type: sectionMatch[1],
        items: [],
      };
      continue;
    }

    // Match list item: - Item description
    const itemMatch = line.match(/^- (.+)$/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]);
    }
  }

  // Add last entry
  if (currentEntry) {
    if (currentSection && currentSection.items.length > 0) {
      currentEntry.sections.push(currentSection as ChangelogEntry['sections'][0]);
    }
    if (currentEntry.sections.length > 0) {
      entries.push(currentEntry);
    }
  }

  // Filter out Unreleased if it has no content
  return {
    entries: entries.filter(e => e.version !== 'Unreleased' || e.sections.length > 0),
  };
}

export function getLatestVersion(): string {
  const changelog = parseChangelog();
  const released = changelog.entries.find(e => e.version !== 'Unreleased');
  return released?.version || '0.0.0';
}
