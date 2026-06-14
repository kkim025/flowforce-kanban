# FlowForce Keyboard Shortcuts Reference

## Navigation

| Key | Action |
|-----|--------|
| `j` | Move focus to next card (down) |
| `k` | Move focus to previous card (up) |
| `←` | Move focus to previous column |
| `→` | Move focus to next column |

## Actions

| Key | Action |
|-----|--------|
| `Enter` | Open task detail modal |
| `Escape` | Close open modal / cancel |

## Cursor Behavior

- Visual cursor highlights the currently focused card (`data-focused` attribute).
- Cursor wraps: at last card, `j` → first card; at first card, `k` → last card.
- Column keys (←/→) do **not** wrap — no-op at board edges.
- Shortcuts are **disabled while a modal is open** (except `Escape`).

## Implementation

- Hook: `src/hooks/useKeyboardNavigation.ts`
- Register on the board root element.
- Pass `disabled={isModalOpen}` to suppress navigation while modals are active.
