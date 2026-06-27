# Keyboard Shortcuts Reference

This page lists every keyboard shortcut available in FlowForce. For the navigation-specific behavior (wrap semantics, modal suppression, etc.), see [Keyboard Navigation](keyboard-navigation.md).

## Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `n` | New task |
| `/` | Focus search |
| `Ctrl+Click` | Multi-select tasks |

The undo / redo shortcuts are wired up in `web/src/components/Board.tsx`'s global `keydown` effect and read `canUndo` / `canRedo` from the kanban context. `n` and `/` are also registered in that effect. `Ctrl+Click` is a pointer-driven multi-select handled by `TaskCard` and dispatched via the kanban reducer.

## Navigation Shortcuts

| Key | Action |
|-----|--------|
| `j` | Move focus to the next card |
| `k` | Move focus to the previous card |
| `←` | Move focus to the previous column |
| `→` | Move focus to the next column |
| `Enter` | Open the focused task |
| `Escape` | Close any open modal / clear the cursor |

These keys are handled by [`web/src/hooks/useKeyboardNavigation.ts`](../../web/src/hooks/useKeyboardNavigation.ts). See [Keyboard Navigation](keyboard-navigation.md) for full behavior details.

## Cursor Behavior

- A single card is highlighted as the cursor at any time (`isFocused` prop on `TaskCard`).
- **Vertical wrap** — `j` wraps from the last card to the first; `k` wraps from the first to the last. Wrap is board-wide (across columns), not per-column.
- **No horizontal wrap** — `←` on the leftmost column and `→` on the rightmost column are no-ops.
- **Modal suppression** — the navigation layer is muted (all six keys suppressed) when a drawer is open. `Escape` still closes the drawer because the drawer listens independently; this is not a property of the navigation hook itself.