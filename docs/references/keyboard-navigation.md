# Keyboard Navigation Reference

## Overview

The board supports vim-style keyboard navigation. A virtual cursor highlights one card at a time; the cursor is moved with `j` / `k` (vertical), `←` / `→` (horizontal), and `Enter` opens the task drawer for the focused card. The implementation lives in `web/src/hooks/useKeyboardNavigation.ts` and is wired up by `web/src/components/Board.tsx`.

## Keybindings

| Key | Action |
|-----|--------|
| `j` | Move focus to the next card |
| `k` | Move focus to the previous card |
| `Enter` | Open the task drawer for the focused card |
| `Escape` | Close the task drawer and clear the cursor |
| `←` | Move focus to the previous column |
| `→` | Move focus to the next column |

Both lowercase (`j` / `k`) and uppercase (`J` / `K`) work; `event.preventDefault()` is called so the keys never reach the browser or any focused input.

## Behavior

### Card Navigation (`j` / `k`)

The cursor is a single `{ columnId, taskId }` pair stored in `Board.tsx` as `focusedCard`. `j` and `k` move through `flatVisibleTasks` (the full ordered list of cards across all columns), so the cursor can wrap across columns within a single keystroke.

- **`j`** — moves to `currentIdx + 1`, wrapping to `0` at the end.
- **`k`** — moves to `currentIdx - 1`, wrapping to the last index from `0`.
- If no card is focused, `j` moves to the first card.
- Wrap is **board-wide**, not per-column: pressing `j` from the last card in the rightmost column lands on the first card in the leftmost column.

### Column Navigation (`←` / `→`)

`←` and `→` change the cursor's column without traversing the flat list:

- **`→`** — moves to the first card of the next column, clamping the row to the target column's last row if it has fewer cards than the current row.
- **`←`** — same in reverse.
- Column navigation **does not wrap** — `←` on the leftmost column and `→` on the rightmost column are no-ops.
- If the target column is empty, the keystroke is a no-op.

### Task Open (`Enter`)

Opens `/tasks/:id` for the focused card. If no card is focused, `Enter` is a no-op.

### Modal Close (`Escape`)

When the task drawer is open, `Escape` navigates back to `/` (which closes the drawer) and clears the cursor. When no drawer is open, `Escape` clears the cursor without navigating.

The drawer component itself also handles `Escape` internally, so the key reaches a close handler regardless of which layer is currently listening.

## Implementation

The hook attaches a single `keydown` listener:

- File: [`web/src/hooks/useKeyboardNavigation.ts`](../../web/src/hooks/useKeyboardNavigation.ts)
- Listener target: `containerRef.current` if provided, otherwise `document.body`. In `Board.tsx` the listener is attached to `scrollContainerRef`, so navigation only fires while the board area has focus.
- Handler signature: `useKeyboardNavigation({ onNavigate, onEnter, onEscape, disabled?, containerRef? })`.
- All five keys call `event.preventDefault()` before invoking their callback.

### `disabled` prop

`disabled` suppresses **all** keys handled by the hook (`j`, `k`, `←`, `→`, `Enter`, `Escape`). `Board.tsx` passes `disabled: isDrawerOpen`, so the navigation layer is muted whenever the task drawer, admin panel, or another drawer route is active. `Escape` still closes the drawer because the drawer component listens for it independently — the navigation hook's muting does not affect that path.

### Cursor indication

The currently focused card is passed to `Column` as `focusedTaskId` (see [`web/src/components/Column.tsx`](../../web/src/components/Column.tsx)) and forwarded to `TaskCard` as `isFocused`. The card renders a visual highlight when the flag is true; the implementation lives in `web/src/components/TaskCard.tsx`.