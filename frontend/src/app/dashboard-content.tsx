"use client";

import { useEffect, useState } from "react";
import { api, Stats, Component } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Layers,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";

export function DashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, componentsData] = await Promise.all([
          api.getStats(),
          api.listComponents(),
        ]);
        setStats(statsData);
        setLowStockItems(componentsData.filter((c) => c.total_quantity <= 5 && c.total_quantity > 0));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Failed to connect to API</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2 text-muted-foreground">
            Make sure the backend is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Components",
      value: stats?.total_components ?? 0,
      description: "Unique part types",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "In Stock",
      value: stats?.total_unique_parts ?? 0,
      description: "Parts with quantity > 0",
      icon: Layers,
      color: "text-green-600",
    },
    {
      title: "Active Projects",
      value: stats?.active_projects ?? 0,
      description: "Open kitting projects",
      icon: FolderOpen,
      color: "text-purple-600",
    },
    {
      title: "Low Stock",
      value: stats?.low_stock_count ?? 0,
      description: "Parts with qty ≤ 5",
      icon: AlertTriangle,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Electronics lab inventory overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Low Stock Alerts
          </h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Part</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">MPN</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-2.5 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary">{item.category_name}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {item.mpn ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant="warning">{item.total_quantity}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lowStockItems.length === 0 && !loading && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm">
          All stocked parts are above the low-stock threshold (5 units).
        </div>
      )}
    </div>
  );
}
