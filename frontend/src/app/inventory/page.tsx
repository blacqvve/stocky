"use client";

import { useEffect, useState, useCallback } from "react";
import { api, LocationNode, InventoryItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Box,
  Archive,
  PackageSearch,
  Plus,
  Minus,
  Pencil,
  Trash2,
  FolderPlus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LocationType = "room" | "rack" | "shelf" | "cabinet" | "drawer" | "grid_bin";

const LOCATION_TYPES: LocationType[] = ["room", "rack", "shelf", "cabinet", "drawer", "grid_bin"];

interface LocationDialogState {
  open: boolean;
  mode: "create" | "edit";
  parentId?: string;
  parentName?: string;
  locationId?: string;
  initialName?: string;
  initialType?: LocationType;
}

// ─── Location Dialog ──────────────────────────────────────────────────────────

interface LocationDialogProps {
  state: LocationDialogState;
  onClose: () => void;
  onSave: () => void;
}

function LocationDialog({ state, onClose, onSave }: LocationDialogProps) {
  const [name, setName] = useState(state.initialName ?? "");
  const [type, setType] = useState<LocationType>(state.initialType ?? "shelf");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (state.open) {
      setName(state.initialName ?? "");
      setType(state.initialType ?? "shelf");
      setError(null);
    }
  }, [state.open, state.initialName, state.initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      if (state.mode === "create") {
        await api.createLocation({ name: trimmed, type, ...(state.parentId ? { parent_id: state.parentId } : {}) });
      } else {
        await api.updateLocation(state.locationId!, { name: trimmed, type });
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const title = state.mode === "create"
    ? state.parentId ? `Add location inside "${state.parentName}"` : "Add root location"
    : "Edit location";

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">Name</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drawer A1"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as LocationType)}>
              <SelectTrigger id="loc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : state.mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  locationName: string;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteDialog({ open, locationName, onClose, onConfirm }: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete location?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1">
          This will permanently delete <span className="font-medium text-foreground">"{locationName}"</span> and all of its children. Inventory in those locations will also be removed.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Location Tree Node ───────────────────────────────────────────────────────

interface TreeNodeProps {
  node: LocationNode;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  onAddChild: (parentId: string, parentName: string) => void;
  onEdit: (node: LocationNode) => void;
  onDelete: (node: LocationNode) => void;
  depth?: number;
}

function TreeNode({ node, selectedId, onSelect, onAddChild, onEdit, onDelete, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isBin = node.type === "grid_bin" || node.type === "drawer";
  const isCabinet = node.type === "cabinet";

  const Icon = isBin ? Box : isCabinet ? Archive : expanded ? FolderOpen : Folder;

  return (
    <div>
      <div
        className={cn(
          "group w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors",
          isSelected
            ? "bg-blue-600 text-white"
            : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand toggle */}
        <button
          className="shrink-0"
          onClick={() => {
            if (hasChildren) setExpanded((e) => !e);
            onSelect(node.id, node.name);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            )
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </button>

        {/* Icon + label */}
        <button
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          onClick={() => {
            if (hasChildren) setExpanded((e) => !e);
            onSelect(node.id, node.name);
          }}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
          <Badge
            variant="secondary"
            className={cn("ml-auto text-xs shrink-0", isSelected && "bg-blue-500 text-white border-blue-500")}
          >
            {node.type}
          </Badge>
        </button>

        {/* Actions (visible on hover) */}
        <div className={cn("flex items-center gap-0.5 shrink-0", menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <button
            title="Add child location"
            className={cn(
              "p-0.5 rounded hover:bg-black/10 transition-colors",
              isSelected && "hover:bg-white/20"
            )}
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id, node.name); }}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            title="Edit"
            className={cn(
              "p-0.5 rounded hover:bg-black/10 transition-colors",
              isSelected && "hover:bg-white/20"
            )}
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            title="Delete"
            className={cn(
              "p-0.5 rounded hover:bg-black/10 transition-colors",
              isSelected ? "hover:bg-white/20" : "hover:text-destructive"
            )}
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inventory Item Row ───────────────────────────────────────────────────────

interface ItemRowProps {
  item: InventoryItem;
  onAdjust: (locationId: string, componentId: string, delta: number) => void;
}

function ItemRow({ item, onAdjust }: ItemRowProps) {
  const [localQty, setLocalQty] = useState(item.quantity);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(item.quantity));

  const attrs = item.attributes as Record<string, string | number | null>;
  const footprint = attrs.footprint || attrs.package || null;

  const handleAdjust = (delta: number) => {
    const newQty = Math.max(0, localQty + delta);
    setLocalQty(newQty);
    onAdjust(item.location_id, item.component_id, delta);
  };

  const handleEditSubmit = () => {
    const newQty = parseInt(editValue);
    if (!isNaN(newQty) && newQty >= 0) {
      const delta = newQty - localQty;
      if (delta !== 0) {
        setLocalQty(newQty);
        onAdjust(item.location_id, item.component_id, delta);
      }
    } else {
      setEditValue(String(localQty));
    }
    setEditing(false);
  };

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm">{item.component_name}</div>
        {item.mpn && (
          <div className="text-xs text-muted-foreground">{item.mpn}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="text-xs">
          {item.category_name}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {footprint ?? "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => handleAdjust(-1)}
            disabled={localQty === 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          {editing ? (
            <Input
              className="w-16 h-6 text-center text-sm px-1"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleEditSubmit()}
              autoFocus
            />
          ) : (
            <button
              className={cn(
                "w-12 text-center text-sm font-semibold rounded px-1 py-0.5 transition-colors",
                localQty === 0
                  ? "text-muted-foreground"
                  : localQty <= 5
                  ? "text-orange-600"
                  : "text-foreground",
                "hover:bg-muted cursor-pointer"
              )}
              onClick={() => {
                setEditValue(String(localQty));
                setEditing(true);
              }}
            >
              {localQty}
            </button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => handleAdjust(1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationDialog, setLocationDialog] = useState<LocationDialogState>({
    open: false,
    mode: "create",
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    locationId: string;
    locationName: string;
  }>({ open: false, locationId: "", locationName: "" });

  const loadTree = useCallback(async () => {
    try {
      const t = await api.getLocationTree();
      setTree(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load locations");
    }
  }, []);

  useEffect(() => {
    loadTree().finally(() => setLoadingTree(false));
  }, [loadTree]);

  const handleSelect = useCallback(async (id: string, name: string) => {
    setSelectedId(id);
    setSelectedName(name);
    setLoadingItems(true);
    try {
      const inv = await api.getInventoryByLocation(id);
      setItems(inv);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const handleAdjust = useCallback(
    async (locationId: string, componentId: string, delta: number) => {
      try {
        await api.adjustInventory({ location_id: locationId, component_id: componentId, delta });
      } catch {
        // Optimistic update already applied in ItemRow
      }
    },
    []
  );

  const openAddRoot = () =>
    setLocationDialog({ open: true, mode: "create" });

  const openAddChild = (parentId: string, parentName: string) =>
    setLocationDialog({ open: true, mode: "create", parentId, parentName });

  const openEdit = (node: LocationNode) =>
    setLocationDialog({
      open: true,
      mode: "edit",
      locationId: node.id,
      initialName: node.name,
      initialType: node.type as LocationType,
    });

  const openDelete = (node: LocationNode) =>
    setDeleteDialog({ open: true, locationId: node.id, locationName: node.name });

  const handleDeleteConfirm = async () => {
    await api.deleteLocation(deleteDialog.locationId);
    setDeleteDialog({ open: false, locationId: "", locationName: "" });
    if (selectedId === deleteDialog.locationId) {
      setSelectedId(null);
      setSelectedName("");
      setItems([]);
    }
    await loadTree();
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Left: Location Tree */}
      <div className="w-72 border-r bg-background flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Storage Locations
          </h2>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Add root location"
            onClick={openAddRoot}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingTree ? (
            <div className="space-y-2 p-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 bg-muted animate-pulse rounded" style={{ width: `${70 + i * 5}%` }} />
              ))}
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-destructive">{error}</div>
          ) : tree.length === 0 ? (
            <div className="p-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No locations yet.</p>
              <Button size="sm" variant="outline" onClick={openAddRoot} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add first location
              </Button>
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                onSelect={handleSelect}
                onAddChild={openAddChild}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Bin Contents */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <PackageSearch className="h-16 w-16 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">
                Select a location to view its contents
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Box className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="font-semibold">{selectedName}</h2>
                <p className="text-xs text-muted-foreground">
                  {loadingItems ? "Loading…" : `${items.length} part${items.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingItems ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <PackageSearch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">This location is empty</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use the Ingest page to add parts
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Part</th>
                      <th className="text-left px-4 py-2.5 font-medium">Category</th>
                      <th className="text-left px-4 py-2.5 font-medium">Footprint</th>
                      <th className="text-left px-4 py-2.5 font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <ItemRow
                        key={`${item.location_id}-${item.component_id}`}
                        item={item}
                        onAdjust={handleAdjust}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <LocationDialog
        state={locationDialog}
        onClose={() => setLocationDialog((s) => ({ ...s, open: false }))}
        onSave={loadTree}
      />
      <DeleteDialog
        open={deleteDialog.open}
        locationName={deleteDialog.locationName}
        onClose={() => setDeleteDialog((s) => ({ ...s, open: false }))}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
