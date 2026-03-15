# Ingest Page — Implementation Notes

## Structure
- Single file: `src/app/ingest/page.tsx` — client component, no sub-components extracted.

## Key Behaviors
- **Save & Duplicate workflow**: on submit, only the `isValue` field (first marked field per category) is cleared; location, category, and all other context fields are retained so the user can rapidly enter similar parts.
- **Auto-generated part name**: derived from `valueField` + optional unit attribute (`resistance_unit` / `capacitance_unit`) + category name. User can override manually.
- **`valueFieldRef`**: attached to whichever `FieldDef` has `isValue: true` — after a successful save, focus returns there via `setTimeout(..., 50)`.
- **Toast system**: ephemeral in-component state, auto-dismissed after 3 s via `setTimeout`. No external toast library used.

## Category Schema
- `CATEGORY_FIELDS` maps category name strings (not IDs) to `FieldDef[]`.
- Falls back to `DEFAULT_FIELDS` (`description`) for any category not explicitly listed.
- `isValue` marks exactly one field per category as the "cleared on duplicate" field.

## API Integration
- Uses `api.batchCreateComponents(locationId, [{ name, category_id, mpn, attributes, quantity }])`.
- Numeric attribute values are cast via `parseFloat`; non-numeric fields stay as strings.
- Location tree is flattened with `flattenLocations` (recursive) to a depth-annotated list for `paddingLeft` indent in the select.

## Extension Points
- Add new categories by appending entries to `CATEGORY_FIELDS` — no other changes needed.
- To persist recent parts across sessions, replace `recentParts` useState with localStorage.
- Keyboard Enter-to-submit is on each attribute input; Tab navigation is native browser behavior.
