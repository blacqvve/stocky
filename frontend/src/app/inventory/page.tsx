"use client";

import { useEffect, useState, useCallback } from "react";
import { api, LocationNode, InventoryItem } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Box,
  PackageSearch,
  Plus,
  Minus,
} from "lucide-react";

// ─── Location Tree ────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: LocationNode;
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  depth?: number;
}

function TreeNode({ node, selectedId, onSelect, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isBin = node.type === "grid_bin" || node.type === "drawer";

  const Icon = isBin ? Box : expanded ? FolderOpen : Folder;

  return (
    <div>
      <button
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
          isSelected
            ? "bg-blue-600 text-white"
            : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e);
          onSelect(node.id, node.name);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{node.name}</span>
        <Badge
          variant="secondary"
          className={cn("ml-auto text-xs shrink-0", isSelected && "bg-blue-500 text-white border-blue-500")}
        >
          {node.type}
        </Badge>
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
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

  // Load location tree
  useEffect(() => {
    api
      .getLocationTree()
      .then(setTree)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingTree(false));
  }, []);

  // Load inventory when location selected
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
        // Optimistic update already applied in ItemRow; silently ignore
      }
    },
    []
  );

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Left: Location Tree */}
      <div className="w-72 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Storage Locations
          </h2>
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
            <div className="p-3 text-sm text-muted-foreground">
              No locations yet. Add locations via the API or CLI.
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                onSelect={handleSelect}
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
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Box className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="font-semibold">{selectedName}</h2>
                <p className="text-xs text-muted-foreground">
                  {loadingItems ? "Loading…" : `${items.length} part${items.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {/* Contents table */}
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
    </div>
  );
}
