# Frontend Foundation — Phase 2 Implementation Notes

## Structure
- `src/lib/api.ts` — Full typed API client. All domain types exported here. `apiFetch<T>` is the single fetch primitive; `api.*` object is the public interface.
- `src/components/ui/` — shadcn-style components: button, card, badge, input, label, select.
- `src/components/layout/Sidebar.tsx` — Client component (needs `usePathname`). Active state uses exact `pathname === item.href` match.
- `src/app/page.tsx` — Server component shell with `<Suspense>` skeleton.
- `src/app/dashboard-content.tsx` — Client component; fetches stats + components in parallel via `Promise.all`.

## Key Decisions
- `apiFetch` strips `Content-Type` header when body is `FormData` (KiCad BOM upload) by passing `headers: {}` to override — browser sets multipart boundary automatically.
- Low-stock threshold is `total_quantity <= 5 && total_quantity > 0` — items with qty 0 are treated as "out of stock" not "low stock".
- `globals.css` corrected `--popover-color` → `--popover-foreground` (was a bug in the original file).
- `tailwind.config.ts` extended with accordion keyframes for Radix UI accordion animation support.

## Extension Points
- Add new nav items to `navItems` array in `Sidebar.tsx`.
- Add new API endpoints to the `api` object in `api.ts` — all types exported alongside.
- New shadcn components follow the same `forwardRef` + `cn()` pattern in `src/components/ui/`.

## Conventions
- All `ui/` components use `React.forwardRef` and export `displayName`.
- `"use client"` directive only on components that use browser APIs or hooks (Sidebar, Select, Label, dashboard-content).
- CSS variables follow HSL bare values (no `hsl()` wrapper) — Tailwind config wraps them in `hsl(var(...))`.
