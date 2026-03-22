import { getAuthHeader, clearCredentials } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const authHeader = getAuthHeader();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    clearCredentials();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ========== Types ==========

export interface Location {
  id: string;
  parent_id: string | null;
  name: string;
  type: 'room' | 'rack' | 'shelf' | 'cabinet' | 'drawer' | 'grid_bin';
  created_at: string;
  updated_at: string;
  children?: LocationNode[];
}

export type LocationNode = Location & { children: LocationNode[] };

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number';
  isValue?: boolean;
}

export interface CategorySchema {
  fields: FieldDef[];
}

export interface Category {
  id: string;
  name: string;
  schema: CategorySchema | null;
  created_at: string;
  updated_at: string;
}

export interface Component {
  id: string;
  mpn: string | null;
  name: string;
  category_id: string;
  category_name: string;
  attributes: Record<string, unknown>;
  datasheet_url: string | null;
  total_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  location_id: string;
  component_id: string;
  quantity: number;
  component_name: string;
  mpn: string | null;
  attributes: Record<string, unknown>;
  category_name: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_components: number;
  total_unique_parts: number;
  active_projects: number;
  low_stock_count: number;
}

export interface BOMLineItem {
  reference: string;
  value: string;
  footprint: string;
  status: 'fully_stocked' | 'partial' | 'missing';
  required: number;
  in_stock: number;
  matches: Component[];
}

// ========== API functions ==========

export const api = {
  // Stats
  getStats: () => apiFetch<Stats>('/stats'),

  // Locations
  getLocationTree: () => apiFetch<LocationNode[]>('/locations/tree'),
  listLocations: () => apiFetch<Location[]>('/locations'),
  createLocation: (data: { parent_id?: string; name: string; type: string }) =>
    apiFetch<Location>('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: { parent_id?: string; name: string; type: string }) =>
    apiFetch<Location>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) =>
    apiFetch<void>(`/locations/${id}`, { method: 'DELETE' }),

  // Categories
  listCategories: () => apiFetch<Category[]>('/categories'),
  createCategory: (data: { name: string; schema: CategorySchema | null }) =>
    apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { name: string; schema: CategorySchema | null }) =>
    apiFetch<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    apiFetch<void>(`/categories/${id}`, { method: 'DELETE' }),

  // Components
  listComponents: (params?: { search?: string; category_id?: string; location_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category_id) qs.set('category_id', params.category_id);
    if (params?.location_id) qs.set('location_id', params.location_id);
    const q = qs.toString();
    return apiFetch<Component[]>(`/components${q ? '?' + q : ''}`);
  },
  getComponent: (id: string) => apiFetch<Component>(`/components/${id}`),
  createComponent: (data: Partial<Component> & { quantity?: number }) =>
    apiFetch<Component>('/components', { method: 'POST', body: JSON.stringify(data) }),
  updateComponent: (id: string, data: Partial<Component>) =>
    apiFetch<Component>(`/components/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComponent: (id: string) =>
    apiFetch<void>(`/components/${id}`, { method: 'DELETE' }),
  batchCreateComponents: (locationId: string, components: Array<Partial<Component> & { quantity: number }>) =>
    apiFetch<Component[]>('/components/batch', {
      method: 'POST',
      body: JSON.stringify({ location_id: locationId, components }),
    }),

  // Inventory
  getInventoryByLocation: (locationId: string) =>
    apiFetch<InventoryItem[]>(`/inventory?location_id=${locationId}`),
  upsertInventory: (data: { location_id: string; component_id: string; quantity: number }) =>
    apiFetch<InventoryItem>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  adjustInventory: (data: { location_id: string; component_id: string; delta: number }) =>
    apiFetch<InventoryItem>('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // Projects
  listProjects: () => apiFetch<Project[]>('/projects'),
  createProject: (data: { name: string; status?: string }) =>
    apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  getProjectBOM: (id: string) => apiFetch<BOMLineItem[]>(`/projects/${id}/bom`),

  // BOM
  analyzeKiCadBOM: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<BOMLineItem[]>('/bom/kicad/analyze', {
      method: 'POST',
      headers: {},
      body: form,
    });
  },
};
