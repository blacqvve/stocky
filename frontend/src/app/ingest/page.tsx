"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api, Category, FieldDef, Location } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, PlusCircle } from "lucide-react";

// ─── Flat location list for selector (with indent for hierarchy) ──────────────

interface FlatLocation {
  id: string;
  label: string;
  depth: number;
}

function flattenLocations(nodes: Location[], depth = 0): FlatLocation[] {
  const result: FlatLocation[] = [];
  for (const node of nodes || []) {
    result.push({ id: node.id, label: node.name, depth });
    if (node.children?.length) {
      result.push(...flattenLocations(node.children as Location[], depth + 1));
    }
  }
  return result;
}

// ─── Toast notification ───────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IngestPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatLocations, setFlatLocations] = useState<FlatLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [locationId, setLocationId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [partName, setPartName] = useState("");
  const [mpn, setMpn] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recentParts, setRecentParts] = useState<{ name: string; qty: number; category: string }[]>([]);

  const valueFieldRef = useRef<HTMLInputElement>(null);
  const toastCounter = useRef(0);

  // Load categories and location tree
  useEffect(() => {
    async function load() {
      try {
        const [cats, tree] = await Promise.all([
          api.listCategories(),
          api.getLocationTree(),
        ]);
        setCategories(cats);
        setFlatLocations(flattenLocations(tree as Location[]));
      } catch {
        // silently ignore - will show empty selects
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Get fields for current category from schema
  const DEFAULT_FIELDS: FieldDef[] = [
    { key: "description", label: "Description", placeholder: "Part description", type: "text", isValue: true },
  ];
  const selectedCategory = categories.find(c => c.id === categoryId);
  const fields: FieldDef[] = selectedCategory?.schema?.fields ?? DEFAULT_FIELDS;
  const valueField = fields.find((f) => f.isValue) ?? fields[0];

  // Auto-generate part name from value field
  useEffect(() => {
    if (categoryName && attributes[valueField?.key ?? ""]) {
      const val = attributes[valueField.key];
      const unitField = fields.find(f => f.key.endsWith('_unit'));
      const unit = unitField ? (attributes[unitField.key] || "") : "";
      setPartName(`${val}${unit ? " " + unit : ""} ${categoryName}`);
    }
  }, [attributes, categoryName, valueField, fields]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    setCategoryId(catId);
    setCategoryName(cat?.name ?? "");
    setAttributes({});
    setPartName("");
  };

  const handleAttrChange = (key: string, value: string) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !categoryId || !partName) {
      addToast("error", "Location, category, and part name are required");
      return;
    }

    setSubmitting(true);
    try {
      // Build typed attributes object
      const typedAttrs: Record<string, string | number | null> = {};
      for (const field of fields) {
        const raw = attributes[field.key];
        if (raw !== undefined && raw !== "") {
          typedAttrs[field.key] = field.type === "number" ? parseFloat(raw) || raw : raw;
        }
      }

      await api.batchCreateComponents(locationId, [
        {
          name: partName,
          category_id: categoryId,
          mpn: mpn || undefined,
          attributes: typedAttrs,
          quantity: parseInt(quantity) || 1,
        },
      ]);

      addToast("success", `Saved: ${partName}`);
      setRecentParts((prev) => [
        { name: partName, qty: parseInt(quantity) || 1, category: categoryName },
        ...prev.slice(0, 9),
      ]);

      // Save & Duplicate: clear only the value field, keep context
      const valueKey = valueField?.key;
      setAttributes((prev) => {
        const next = { ...prev };
        if (valueKey) delete next[valueKey];
        return next;
      });
      setPartName("");
      setMpn("");

      // Refocus value input
      setTimeout(() => valueFieldRef.current?.focus(), 50);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-40 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <PlusCircle className="h-7 w-7 text-blue-500" />
          Ingest Parts
        </h1>
        <p className="text-muted-foreground mt-1">
          Rapid data entry — Save &amp; Duplicate retains context for fast batch entry
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Part</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Location + Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Storage Location *</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger id="location">
                        <SelectValue placeholder="Select location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            <span style={{ paddingLeft: `${loc.depth * 12}px` }}>
                              {loc.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={categoryId} onValueChange={handleCategoryChange}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dynamic attribute fields */}
                {categoryId && (
                  <div className="grid grid-cols-2 gap-3">
                    {fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={field.key}>
                          {field.label}
                          {field.isValue && (
                            <span className="ml-1 text-xs text-muted-foreground">(cleared on duplicate)</span>
                          )}
                        </Label>
                        <Input
                          id={field.key}
                          ref={field.isValue ? valueFieldRef : undefined}
                          type={field.type}
                          step={field.type === "number" ? "any" : undefined}
                          placeholder={field.placeholder}
                          value={attributes[field.key] ?? ""}
                          onChange={(e) => handleAttrChange(field.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSubmit(e as unknown as React.FormEvent);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Part name + MPN */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="partName">Part Name *</Label>
                    <Input
                      id="partName"
                      placeholder="Auto-generated or manual"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mpn">MPN (optional)</Label>
                    <Input
                      id="mpn"
                      placeholder="Manufacturer part number"
                      value={mpn}
                      onChange={(e) => setMpn(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="w-32 space-y-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting || !locationId || !categoryId}>
                    {submitting ? "Saving…" : "Save & Duplicate"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAttributes({});
                      setPartName("");
                      setMpn("");
                      setQuantity("1");
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent saves */}
        <div>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Recently Added</CardTitle>
            </CardHeader>
            <CardContent>
              {recentParts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Saved parts will appear here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentParts.map((p, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          {p.category}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">
                        &times;{p.qty}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
