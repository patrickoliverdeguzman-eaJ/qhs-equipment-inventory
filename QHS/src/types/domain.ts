export type UserRole = 'admin' | 'custodian' | 'user';

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  isActive?: boolean;
  address?: string | null;
  phone_number?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Laboratory {
  id: number;
  name: string;
  location?: string | null;
  description?: string | null;
  image?: string | null;
  status?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface EquipmentUnit {
  id: number;
  unit_id?: string;
  condition?: string;
  status?: string;
  isBorrowed?: boolean | 0 | 1 | '0' | '1' | 'true' | 'false';
}

export interface Equipment {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  laboratory?: Laboratory | null;
  category?: Category | null;
  items?: EquipmentUnit[];
  total_quantity?: number;
  available_quantity?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export type ApiErrors = Record<string, string[]>;
