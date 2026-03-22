"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PackageSearch,
  PlusCircle,
  FolderOpen,
  Cpu,
  Settings2,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: PackageSearch },
  { href: "/ingest", label: "Ingest Parts", icon: PlusCircle },
  { href: "/projects", label: "Projects / BOM", icon: FolderOpen },
  { href: "/settings/categories", label: "Item Types", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <div className="p-5 border-b border-gray-800 flex items-center gap-2">
        <Cpu className="h-6 w-6 text-blue-400" />
        <span className="font-bold text-lg tracking-tight">Stocky</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        Electronics Lab Inventory
      </div>
    </aside>
  );
}
