# Inventory Explorer — Implementation Notes

## Structure
- Single file: `src/app/inventory/page.tsx`
- Three components: `TreeNode` (recursive), `ItemRow`, `InventoryPage` (page root)

## Key Decisions
- `TreeNode` is self-referencing — renders `node.children` recursively, no external helper needed.
- Nodes with `depth < 2` start expanded; deeper nodes start collapsed.
- Quantity adjustment is optimistic: `ItemRow` updates `localQty` immediately, then fires `api.adjustInventory`. Failures are silently swallowed since the UI already moved.
- Clicking a quantity number activates an inline `<Input>` for direct entry; blur or Enter commits the delta.
- `handleSelect` and `handleAdjust` are `useCallback`-memoised to avoid unnecessary child re-renders.

## API contracts used
- `api.getLocationTree()` → `LocationNode[]` (recursive, children always present)
- `api.getInventoryByLocation(id)` → `InventoryItem[]`
- `api.adjustInventory({ location_id, component_id, delta })` → `InventoryItem`

## Visual cues
- Qty 0: muted text. Qty 1–5: orange. Qty 6+: default foreground.
- Selected tree node: `bg-blue-600 text-white`; its badge gets `bg-blue-500`.
- Bin/drawer nodes use `Box` icon; folders use `Folder`/`FolderOpen` based on expand state.

## Extension Points
- Add search/filter bar above the tree by lifting `tree` state and filtering before rendering.
- Add a bulk-move feature by extending `ItemRow` with a checkbox and wiring a batch API call in `InventoryPage`.
- Replace the flat table with a card grid for visual bin layout by swapping the `<table>` block.
