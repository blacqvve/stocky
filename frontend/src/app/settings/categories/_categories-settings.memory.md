# Dynamic Item Types — Implementation Notes

## What was built
- Migration `003_category_schema` adds a nullable `JSONB schema` column to `categories` with seed data for 8 built-in types.
- Backend: `scanCategory` helper centralises schema scanning; `CreateCategoryParams`, `UpdateCategoryParams`, and `DeleteCategory` extend the query layer. Category handler now has full CRUD with duplicate/FK conflict guards.
- Frontend: `FieldDef` and `CategorySchema` types live in `@/lib/api.ts` (exported). `Category.schema` is `CategorySchema | null`.
- `/settings/categories` page: split-pane list + editor, inline field table (key / label / placeholder / type / isValue checkbox / reorder / delete), toast feedback.
- Ingest page now reads fields from `selectedCategory.schema.fields` instead of the deleted `CATEGORY_FIELDS` constant. Unit field lookup is schema-driven via `fields.find(f => f.key.endsWith('_unit'))`.
- Sidebar gains "Item Types" link (Settings2 icon) pointing to `/settings/categories`.

## Key Decisions
- `Checkbox` from shadcn/ui was absent — replaced with a native `<input type="checkbox">` to stay within the existing component surface.
- `DEFAULT_FIELDS` moved inside the component so it's co-located with the `fields` derivation, avoiding stale-closure risk in the useEffect dependency array.
- `scanCategory` is a package-private helper (lowercase) following the existing `scanComponentWithCategory` pattern.

## Extension Points
- Add more seed schemas by appending `UPDATE categories SET schema = ...` to the up-migration.
- Field types beyond `text | number` require updating the `FieldDef.type` union in `api.ts` and the Select options in the editor.
- The `isValue` flag drives both auto-name generation (ingest) and the "cleared on duplicate" UX — any new flag semantics should extend `FieldDef` rather than hard-coding them.
