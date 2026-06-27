import React, { useEffect, useCallback } from 'react';

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface UseKeyboardNavigationOptions {
  /** Called when j/k pressed — direction tells you which way */
  onNavigate: (direction: NavigationDirection) => void;
  /** Called when Enter pressed */
  onEnter: () => void;
  /** Called when Escape pressed */
  onEscape: () => void;
  /** Disable all shortcuts (e.g., when a modal is open) */
  disabled?: boolean;
  /**
   * Ref to the container element to attach keyboard listeners to.
   * When omitted, listeners are attached to the container (default behavior).
   */
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * FlowForce keyboard navigation hook.
 *
 * Register this on the board root element.
 * j/k — vim-style card navigation (up/down)
 * ←/→ — column navigation
 * Enter — open task
 * Escape — close modal
 */
export function useKeyboardNavigation({
  onNavigate,
  onEnter,
  onEscape,
  disabled = false,
  containerRef,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'j':
        case 'J':
          event.preventDefault();
          onNavigate('down');
          break;
        case 'k':
        case 'K':
          event.preventDefault();
          onNavigate('up');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onNavigate('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNavigate('right');
          break;
        case 'Enter':
          event.preventDefault();
          onEnter();
          break;
        case 'Escape':
          event.preventDefault();
          onEscape();
          break;
      }
    },
    [disabled, onNavigate, onEnter, onEscape]
  );

  useEffect(() => {
    const target = containerRef?.current ?? document.body;
    target.addEventListener('keydown', handleKeyDown);
    return () => target.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, containerRef]);
}
