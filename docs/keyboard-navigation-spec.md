# FlowForce: Full Keyboard Navigation — Spec

## Overview

FlowForce supports vim-style keyboard navigation for power users. This spec defines the required keybindings and expected behavior.

## Keybindings

| Key | Action |
|-----|--------|
| `j` | Move focus to next card (down) |
| `k` | Move focus to previous card (up) |
| `Enter` | Open focused task (open task detail modal) |
| `Escape` | Close any open modal / cancel current action |
| `←` | Move focus to previous column |
| `→` | Move focus to next column |

## Behavior Details

### Card Navigation (j / k)
- Focus follows a virtual cursor — a single highlighted card at a time.
- `j` moves down: next card in current column, or first card of next column if at column bottom.
- `k` moves up: previous card in current column, or last card of previous column if at column top.
- Cursor wraps within the board: at the last card, `j` wraps to the first card; at the first card, `k` wraps to the last.
- Cursor does **not** wrap between columns — column navigation uses arrow keys.

### Task Open (Enter)
- Opens the task detail modal for the currently focused card.
- If no card is focused, no-op.
- Modal must be closeable by `Escape`.

### Modal Close (Escape)
- Closes any open modal (task detail, search results, confirmations).
- If no modal is open, `Escape` is a no-op (does not deselect the card).

### Column Navigation (← / →)
- `→` moves focus to the first card in the next column.
- `←` moves focus to the first card in the previous column.
- If already at the leftmost column, `←` is a no-op.
- If already at the rightmost column, `→` is a no-op.
- Column change preserves relative row position when possible.

## Implementation Notes

- All keyboard handlers should be registered on a focus-management container (e.g., the board root or a focus trap).
- Use `useEffect` + `addEventListener` / `useKeyboardShortcut` hook pattern.
- Ensure focus is not stolen by inputs, buttons, or other interactive elements during navigation.
- Consider an `aria-selected` or `data-focused` attribute on the cursor card for visual indication.
- The shortcut layer should be disabled when a modal is open (except `Escape`).

## Dependency

- **Blocked by ENG-1** — dev environment and repo must be set up before implementation begins.
- **Owner:** Frontend Engineer (reports to CTO)
- **Parent issue:** REV-3

## Status

- [x] Spec written (2026-06-14, CEO)
- [ ] Implementation
- [ ] Review
- [ ] Done