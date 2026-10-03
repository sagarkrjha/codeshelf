import { useState, useEffect, useCallback } from 'react';

export type ActivityTab = 'explorer' | 'search' | 'tags' | 'settings';

export function useLayoutState() {
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>(() => {
    try {
      const stored = localStorage.getItem('codeshelf_active_tab');
      if (stored === 'explorer' || stored === 'search' || stored === 'tags' || stored === 'settings') {
        return stored;
      }
      return 'explorer';
    } catch {
      return 'explorer';
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('codeshelf_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isListCollapsed, setIsListCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('codeshelf_list_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      localStorage.setItem('codeshelf_active_tab', activeActivityTab);
    } catch {}
  }, [activeActivityTab]);

  useEffect(() => {
    try {
      localStorage.setItem('codeshelf_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {}
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('codeshelf_list_collapsed', String(isListCollapsed));
    } catch {}
  }, [isListCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when user is typing in text editor or inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ctrl/Cmd + B: Toggle primary sidebar
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
        return;
      }

      // Ctrl/Cmd + Shift + E: Switch to Explorer tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActiveActivityTab('explorer');
        setIsSidebarCollapsed(false);
        return;
      }

      // Ctrl/Cmd + Shift + F: Switch to Search tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveActivityTab('search');
        setIsSidebarCollapsed(false);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  return {
    activeActivityTab,
    setActiveActivityTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isListCollapsed,
    setIsListCollapsed,
    expandedCategories,
    toggleCategory,
  };
}

