# Phase 5: Projects & BOM Page — Implementation Notes

## Structure
- Single file: `src/app/projects/page.tsx`
- Sub-components (all in-file): `DropZone`, `BOMTable`, `PickList`, `ProjectsSection`

## Key Decisions
- `statusConfig` map drives all color-coding (rowClass, Badge variant, icon) for `fully_stocked | partial | missing` — extend here for new statuses.
- `DropZone` handles both drag-and-drop and click-to-browse; clears input value after selection so the same file can be re-uploaded.
- BOM upload uses `FormData` via `api.analyzeKiCadBOM` — the `apiFetch` call passes `headers: {}` to let the browser set the correct `multipart/form-data` boundary automatically.
- Pick list `grouped` variable is scaffolded for future location-grouping but currently places all items under "Unlocated" pending backend match data surfacing location names.
- Print support via `window.print()` with `print:` Tailwind variants on the pick list table header and checkbox column.

## API contracts used
- `api.listProjects()` → `Project[]`
- `api.createProject({ name })` → `Project`
- `api.analyzeKiCadBOM(file: File)` → `BOMLineItem[]`
- `BOMLineItem.matches` is `Component[]` — location data not yet embedded; future backend change would expose location per match for proper pick-list grouping.

## Extension Points
- Add project deletion/status change by extending `ProjectsSection` with an actions menu per card.
- Pick list location grouping: when `BOMLineItem.matches[0]` carries a `location_name`, replace "See inventory" and group rows by location.
- Badge `variant` values `"success"` and `"warning"` must be supported by the Badge component — verify if adding new statuses.
