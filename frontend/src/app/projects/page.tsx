"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, BOMLineItem, Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  Printer,
} from "lucide-react";

// ─── Status helpers ───────────────────────────────────────────────────────────

const statusConfig = {
  fully_stocked: {
    label: "Stocked",
    variant: "success" as const,
    icon: CheckCircle2,
    rowClass: "bg-green-50/50",
  },
  partial: {
    label: "Partial",
    variant: "warning" as const,
    icon: AlertCircle,
    rowClass: "bg-yellow-50/50",
  },
  missing: {
    label: "Missing",
    variant: "destructive" as const,
    icon: XCircle,
    rowClass: "bg-red-50/50",
  },
};

// ─── Drag & Drop Zone ─────────────────────────────────────────────────────────

interface DropZoneProps {
  onFile: (file: File) => void;
  loading: boolean;
}

function DropZone({ onFile, loading }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer",
        dragging
          ? "border-blue-500 bg-blue-50"
          : "border-muted-foreground/25 hover:border-blue-400 hover:bg-muted/30"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing BOM…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Drop KiCad BOM CSV here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse — expects Reference, Value, Footprint columns
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOM Results Table ────────────────────────────────────────────────────────

interface BOMTableProps {
  items: BOMLineItem[];
}

function BOMTable({ items }: BOMTableProps) {
  const summary = {
    fully_stocked: items.filter((i) => i.status === "fully_stocked").length,
    partial: items.filter((i) => i.status === "partial").length,
    missing: items.filter((i) => i.status === "missing").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium">{items.length} line items:</span>
        <Badge variant="success">{summary.fully_stocked} stocked</Badge>
        {summary.partial > 0 && <Badge variant="warning">{summary.partial} partial</Badge>}
        {summary.missing > 0 && <Badge variant="destructive">{summary.missing} missing</Badge>}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Ref</th>
              <th className="text-left px-4 py-2.5 font-medium">Value</th>
              <th className="text-left px-4 py-2.5 font-medium">Footprint</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-right px-4 py-2.5 font-medium">In Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const config = statusConfig[item.status] ?? statusConfig.missing;
              const Icon = config.icon;
              return (
                <tr
                  key={idx}
                  className={cn("border-t transition-colors hover:brightness-95", config.rowClass)}
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{item.reference}</td>
                  <td className="px-4 py-2.5 font-medium">{item.value}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{item.footprint || "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={config.variant} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{item.in_stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pick List ────────────────────────────────────────────────────────────────

interface PickListProps {
  items: BOMLineItem[];
}

function PickList({ items }: PickListProps) {
  const stocked = items.filter((i) => i.status === "fully_stocked" || i.status === "partial");

  if (stocked.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        No stocked parts to pick.
      </div>
    );
  }

  // Group by first match location
  const grouped: Record<string, BOMLineItem[]> = { "Unlocated": [] };
  for (const item of stocked) {
    if (item.matches && item.matches.length > 0) {
      grouped["Unlocated"].push(item);
    } else {
      grouped["Unlocated"].push(item);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Pick List ({stocked.length} items)
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-1.5"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
      <div className="rounded-lg border overflow-hidden print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 print:bg-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Ref</th>
              <th className="text-left px-4 py-2.5 font-medium">Value</th>
              <th className="text-left px-4 py-2.5 font-medium">Footprint</th>
              <th className="text-right px-4 py-2.5 font-medium">Qty</th>
              <th className="text-left px-4 py-2.5 font-medium">Location</th>
              <th className="text-center px-4 py-2.5 font-medium print:block hidden">✓</th>
            </tr>
          </thead>
          <tbody>
            {stocked.map((item, idx) => {
              const locationName =
                item.matches?.[0]
                  ? "See inventory"
                  : "Not located";
              return (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{item.reference}</td>
                  <td className="px-4 py-2 font-medium">{item.value}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{item.footprint || "—"}</td>
                  <td className="px-4 py-2 text-right">{item.required}</td>
                  <td className="px-4 py-2 text-muted-foreground">{locationName}</td>
                  <td className="px-4 py-2 text-center print:block hidden">
                    <span className="inline-block w-4 h-4 border rounded" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Projects Section ─────────────────────────────────────────────────────────

interface ProjectsSectionProps {
  projects: Project[];
  onNew: (name: string) => void;
}

function ProjectsSection({ projects, onNew }: ProjectsSectionProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Projects
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCreating((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {creating && (
        <div className="flex gap-2">
          <Input
            placeholder="Project name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onNew(name.trim());
                setName("");
                setCreating(false);
              }
              if (e.key === "Escape") setCreating(false);
            }}
            autoFocus
          />
          <Button
            onClick={() => {
              if (name.trim()) {
                onNew(name.trim());
                setName("");
                setCreating(false);
              }
            }}
          >
            Create
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border p-3 flex items-start justify-between hover:bg-muted/30 transition-colors"
            >
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  statusColors[p.status] ?? statusColors.active
                )}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bomItems, setBomItems] = useState<BOMLineItem[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPickList, setShowPickList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setAnalyzing(true);
    setError(null);
    setBomItems(null);
    setShowPickList(false);
    try {
      const results = await api.analyzeKiCadBOM(file);
      setBomItems(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze BOM");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleNewProject = useCallback(async (name: string) => {
    try {
      const p = await api.createProject({ name });
      setProjects((prev) => [p, ...prev]);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects & BOM</h1>
        <p className="text-muted-foreground mt-1">
          Upload a KiCad BOM CSV to check stock and generate a pick list
        </p>
      </div>

      {/* Projects list */}
      <ProjectsSection projects={projects} onNew={handleNewProject} />

      {/* BOM Analyzer */}
      <Card>
        <CardHeader>
          <CardTitle>KiCad BOM Analyzer</CardTitle>
          <CardDescription>
            Export from KiCad: Tools → Generate BOM → CSV with Reference, Value, Footprint columns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DropZone onFile={handleFile} loading={analyzing} />

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {bomItems && (
            <div className="space-y-6">
              <BOMTable items={bomItems} />

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowPickList((v) => !v)}
                  variant={showPickList ? "secondary" : "default"}
                  className="gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  {showPickList ? "Hide Pick List" : "Generate Pick List"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setBomItems(null); setShowPickList(false); }}
                >
                  Clear
                </Button>
              </div>

              {showPickList && <PickList items={bomItems} />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
