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
  equipment_id?: number;
  unit_id?: string;
  condition?: string;
  status?: string;
  isBorrowed?: boolean | 0 | 1 | '0' | '1' | 'true' | 'false';
}

export type TransactionStatus = 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected';
export type TransactionLifecycleStage = TransactionStatus | 'partially_returned' | 'overdue';

export interface CustodyUnit extends EquipmentUnit {
  unit_id: string;
  issued_at?: string | null;
  condition_at_issue?: string | null;
  returned_at?: string | null;
  condition_at_return?: string | null;
  return_notes?: string | null;
  returned_by_id?: number | null;
  returned_by_name?: string | null;
}

export interface TransactionEquipment {
  id: number;
  name: string;
  quantity: number;
  items: CustodyUnit[];
}

export interface EquipmentTransaction {
  id: number;
  borrower_id: number;
  borrower_name: string;
  borrower_email?: string | null;
  laboratory_id: number;
  laboratory?: Laboratory | null;
  borrow_date: string;
  return_date?: string | null;
  status: TransactionStatus;
  lifecycle_stage: TransactionLifecycleStage;
  is_overdue: boolean;
  is_due_today: boolean;
  total_assigned_count: number;
  issued_count: number;
  returned_count: number;
  outstanding_count: number;
  approved_at?: string | null;
  approved_by_name?: string | null;
  issued_at?: string | null;
  issued_by_name?: string | null;
  issue_notes?: string | null;
  returned_at?: string | null;
  returned_by_name?: string | null;
  rejection_reason?: string | null;
  equipment_summary?: string;
  equipment: TransactionEquipment[];
}

export interface Equipment {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  laboratory?: Laboratory | null;
  laboratory_id?: number;
  category?: Category | null;
  items?: EquipmentUnit[];
  total_quantity?: number;
  available_quantity?: number;
}

export type MaintenanceType = 'incident' | 'repair' | 'preventive_maintenance' | 'calibration' | 'cleaning' | 'safety_inspection' | 'validation';
export type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'waiting_for_parts' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'normal' | 'high' | 'critical';

export interface MaintenanceWorkOrder {
  id: number;
  equipment_item_id: number;
  equipment_id?: number | null;
  unit_id?: string | null;
  equipment_name?: string | null;
  current_condition?: string | null;
  laboratory_id: number;
  laboratory?: Laboratory | null;
  source_transaction_id?: number | null;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  description?: string | null;
  condition_before?: string | null;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  reported_by_id?: number | null;
  reported_by_name?: string | null;
  scheduled_at?: string | null;
  due_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  service_provider?: string | null;
  estimated_cost?: string | null;
  actual_cost?: string | null;
  completion_notes?: string | null;
  result_condition?: string | null;
  recurrence_interval_days?: number | null;
  next_due_at?: string | null;
  is_overdue: boolean;
  is_due_soon: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export type ApiErrors = Record<string, string[]>;
