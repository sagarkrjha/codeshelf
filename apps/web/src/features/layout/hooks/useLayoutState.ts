import { useState, useEffect, useCallback } from 'react';

export function useLayoutState() {
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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (e.shiftKey) {
          setIsListCollapsed((prev) => !prev);
        } else {
          setIsSidebarCollapsed((prev) => !prev);
        }
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
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isListCollapsed,
    setIsListCollapsed,
    expandedCategories,
    toggleCategory,
  };
}
