"use client";

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  global?: boolean; // If true, works everywhere, if false, only on specific pages
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as any)?.contentEditable === 'true'
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;

      return keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Global keyboard shortcuts hook for the entire app
export function useGlobalKeyboardShortcuts() {
  const router = useRouter();

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      altKey: true,
      action: () => router.push('/dashboard'),
      description: 'Go to Dashboard',
      global: true
    },
    {
      key: 'c',
      altKey: true,
      action: () => router.push('/dashboard/clients'),
      description: 'Go to Clients',
      global: true
    },
    {
      key: 'e',
      altKey: true,
      action: () => router.push('/dashboard/time-entries'),
      description: 'Go to Time Entries',
      global: true
    },
    {
      key: 'i',
      altKey: true,
      action: () => router.push('/dashboard/invoices'),
      description: 'Go to Invoices',
      global: true
    },
    {
      key: 'r',
      altKey: true,
      action: () => router.push('/dashboard/reports'),
      description: 'Go to Reports',
      global: true
    },
    {
      key: '?',
      shiftKey: true,
      action: () => {
        // This will trigger the keyboard shortcuts modal
        window.dispatchEvent(new CustomEvent('show-shortcuts-modal'));
      },
      description: 'Show Keyboard Shortcuts',
      global: true
    }
  ];

  useKeyboardShortcuts(globalShortcuts);

  return globalShortcuts;
}

// Page-specific shortcuts for different sections
export const pageShortcuts = {
  timeEntries: [
    {
      key: 'n',
      action: () => window.dispatchEvent(new CustomEvent('create-time-entry')),
      description: 'Log New Time Entry'
    },
    {
      key: 's',
      action: () => window.dispatchEvent(new CustomEvent('start-timer')),
      description: 'Start Timer'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => window.dispatchEvent(new CustomEvent('export-time-entries')),
      description: 'Export Time Entries'
    }
  ],

  clients: [
    {
      key: 'n',
      action: () => window.dispatchEvent(new CustomEvent('create-client')),
      description: 'Create New Client'
    },
    {
      key: 'f',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus Search'
    }
  ],

  invoices: [
    {
      key: 'n',
      action: () => window.dispatchEvent(new CustomEvent('create-invoice')),
      description: 'Create New Invoice'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => window.dispatchEvent(new CustomEvent('export-invoices')),
      description: 'Export Invoice Data'
    }
  ],

  reports: [
    {
      key: 'r',
      ctrlKey: true,
      action: () => window.dispatchEvent(new CustomEvent('refresh-reports')),
      description: 'Refresh Reports'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => window.dispatchEvent(new CustomEvent('export-reports')),
      description: 'Export Reports'
    },
    {
      key: '1',
      action: () => window.dispatchEvent(new CustomEvent('set-date-range', { detail: 'this_month' })),
      description: 'This Month'
    },
    {
      key: '2',
      action: () => window.dispatchEvent(new CustomEvent('set-date-range', { detail: 'last_month' })),
      description: 'Last Month'
    },
    {
      key: '3',
      action: () => window.dispatchEvent(new CustomEvent('set-date-range', { detail: 'last_30_days' })),
      description: 'Last 30 Days'
    }
  ]
};

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}