"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Category, FieldDef, CategorySchema } from "@/lib/api";
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
import { ChevronUp, ChevronDown, Trash2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

function emptyField(): FieldDef {
  return { key: "", label: "", placeholder: "", type: "text" };
}

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editFields, setEditFields] = useState<FieldDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = { current: 0 };

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  async function load() {
    try {
      const cats = await api.listCategories();
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function selectCategory(cat: Category | null) {
    setSelected(cat);
    if (cat) {
      setEditName(cat.name);
      setEditFields(cat.schema?.fields ? [...cat.schema.fields] : []);
    } else {
      setEditName("");
      setEditFields([]);
    }
  }

  function newCategory() {
    setSelected(null);
    setEditName("");
    setEditFields([emptyField()]);
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = [...editFields];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setEditFields(next);
  }

  function updateField(index: number, patch: Partial<FieldDef>) {
    setEditFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      // Only one field can be isValue
      if (patch.isValue) {
        next.forEach((f, i) => { if (i !== index) f.isValue = false; });
      }
      return next;
    });
  }

  function removeField(index: number) {
    setEditFields((prev) => prev.filter((_, i) => i !== index));
  }

  function addField() {
    setEditFields((prev) => [...prev, emptyField()]);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const schema: CategorySchema | null = editFields.length > 0
        ? { fields: editFields.filter(f => f.key.trim()) }
        : null;

      let saved: Category;
      if (selected) {
        saved = await api.updateCategory(selected.id, { name: editName, schema });
        setCategories((prev) => prev.map((c) => c.id === saved.id ? saved : c));
        setSelected(saved);
        addToast("success", `Updated "${saved.name}"`);
      } else {
        saved = await api.createCategory({ name: editName, schema });
        setCategories((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
        setSelected(saved);
        addToast("success", `Created "${saved.name}"`);
      }
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      await api.deleteCategory(selected.id);
      setCategories((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(null);
      setEditName("");
      setEditFields([]);
      addToast("success", "Category deleted");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const isEditing = selected !== null || editName !== "" || editFields.length > 0;

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Item Types</h1>
        <p className="text-muted-foreground mt-1">Define categories and their custom attribute fields</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: category list */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={newCategory}>
            <Plus className="h-4 w-4 mr-2" />
            New Item Type
          </Button>
          <div className="space-y-2">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                className={`cursor-pointer transition-colors hover:border-blue-400 ${selected?.id === cat.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}`}
                onClick={() => selectCategory(cat)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="font-medium text-sm">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {cat.schema?.fields?.length ?? 0} fields
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: editor */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selected ? `Edit: ${selected.name}` : "New Item Type"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name">Name *</Label>
                  <Input
                    id="cat-name"
                    placeholder="e.g. Fuse"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                {/* Field table */}
                <div className="space-y-2">
                  <Label>Fields</Label>
                  <div className="space-y-2">
                    {editFields.map((field, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        {/* Reorder */}
                        <div className="col-span-1 flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveField(i, -1)}
                            disabled={i === 0}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(i, 1)}
                            disabled={i === editFields.length - 1}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Key */}
                        <div className="col-span-2">
                          <Input
                            placeholder="key"
                            value={field.key}
                            onChange={(e) => updateField(i, { key: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        {/* Label */}
                        <div className="col-span-2">
                          <Input
                            placeholder="Label"
                            value={field.label}
                            onChange={(e) => updateField(i, { label: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        {/* Placeholder */}
                        <div className="col-span-3">
                          <Input
                            placeholder="Placeholder"
                            value={field.placeholder}
                            onChange={(e) => updateField(i, { placeholder: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        {/* Type */}
                        <div className="col-span-2">
                          <Select
                            value={field.type}
                            onValueChange={(v) => updateField(i, { type: v as 'text' | 'number' })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">text</SelectItem>
                              <SelectItem value="number">number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* isValue */}
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={!!field.isValue}
                            onChange={(e) => updateField(i, { isValue: e.target.checked })}
                            title="Main value (cleared on duplicate)"
                            className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                          />
                        </div>
                        {/* Delete */}
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeField(i)}
                            className="p-1 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Header labels */}
                    {editFields.length > 0 && (
                      <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-0.5">
                        <div className="col-span-1" />
                        <div className="col-span-2">key</div>
                        <div className="col-span-2">label</div>
                        <div className="col-span-3">placeholder</div>
                        <div className="col-span-2">type</div>
                        <div className="col-span-1 text-center">value?</div>
                        <div className="col-span-1" />
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addField}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Field
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  {selected && (
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting…" : "Delete Category"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => { setSelected(null); setEditName(""); setEditFields([]); }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Select a category to edit, or create a new one
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
              toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
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
