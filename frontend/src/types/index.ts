export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  plan: string;
  currency: string;
  timezone: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  role: Role | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isOwner: boolean;
}

export interface LoginResponse {
  user: User;
  company: Company;
  role: Role;
  permissions: string[];
  accessToken: string;
  refreshToken: string;
  isOwner?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardKPIs {
  totalLeads: { value: number; growth: number };
  totalContacts: { value: number };
  openOpportunities: { value: number; totalValue: number };
  wonOpportunities: { value: number };
  pendingTasks: { value: number };
  overdueTasks: { value: number };
}

export interface DashboardData {
  kpis: DashboardKPIs;
  recentActivities: RecentActivity[];
  leadsBySource: { source: string; count: number }[];
  opportunitiesByStage: { stageId: string; stageName: string; color: string; count: number; value: number }[];
  timeline: { label: string; leads: number }[];
  isDaily: boolean;
}

export interface RecentActivity {
  id: string;
  type: string;
  subject: string;
  owner: string;
  ownerAvatar?: string;
  entity?: string;
  createdAt: string;
}

export interface UserWithRole extends User {
  role: Role;
  isOwner: boolean;
  isActive: boolean;
  phone?: string;
  createdAt: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

// ─── CRM Types ────────────────────────────────────────────────────

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  score: number;
  notes?: string;
  tags: string[];
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string; email?: string } | null;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  source?: string;
  status: string;
  leadScore: number;
  notes?: string;
  tags: string[];
  accountId?: string;
  accountName?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

export interface Account {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  annualRevenue?: number;
  country?: string;
  city?: string;
  address?: string;
  notes?: string;
  tags: string[];
  contactCount: number;
  oppCount: number;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  probability?: number;
}

export interface Opportunity {
  id: string;
  name: string;
  amount: number;
  currency: string;
  probability?: number;
  closeDate?: string;
  closedAt?: string;
  status: 'open' | 'won' | 'lost';
  source?: string;
  notes?: string;
  tags: string[];
  accountId?: string;
  accountName?: string;
  contactId?: string;
  stageId?: string;
  stage?: { id: string; name: string; color: string } | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

export interface KanbanData {
  stages: (PipelineStage & { opportunities: Opportunity[] })[];
  totalValue: number;
}

export interface Activity {
  id: string;
  type: string;
  subject?: string;
  body?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  leadId?: string;
  contactId?: string;
  opportunityId?: string;
  createdAt: string;
  owner: { id: string; firstName: string; lastName: string };
}

export interface CrmTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  completedAt?: string;
  leadId?: string;
  contactId?: string;
  opportunityId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

export interface LeadStats {
  new: number;
  contacted: number;
  qualified: number;
  unqualified: number;
  converted: number;
  total: number;
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
  sortOrder?: number;
}

export interface Quote {
  id: string;
  number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  itemCount?: number;
  items?: QuoteItem[];
  accountId?: string;
  accountName?: string;
  opportunityId?: string;
  contactId?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

// ─── ERP Types ────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  taxRate: number;
  trackInventory: boolean;
  stock: number;
  minStock: number;
  isActive: boolean;
  isLowStock: boolean;
  supplierId?: string;
  supplierName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  stockAfter: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
}

export interface ProductStats {
  total: number;
  lowStock: number;
  totalValue: number;
  categories: number;
}

export interface InvoiceItem {
  id?: string;
  productId?: string;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  terms?: string;
  itemCount?: number;
  items?: InvoiceItem[];
  accountId?: string;
  accountName?: string;
  opportunityId?: string;
  quoteId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

export interface InvoiceStats {
  draft: { count: number; total: number };
  sent: { count: number; total: number };
  paid: { count: number; total: number };
  overdue: { count: number; total: number };
  cancelled: { count: number; total: number };
  totalPaid: number;
}

export interface QuoteStats {
  draft: { count: number; total: number };
  sent: { count: number; total: number };
  accepted: { count: number; total: number };
  rejected: { count: number; total: number };
  expired: { count: number; total: number };
  totalValue: number;
}

// ─── Apollo Types ─────────────────────────────────────────────────

export interface ApolloContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organization: string | null;
  city: string | null;
  country: string | null;
  linkedinUrl: string | null;
}

export interface ApolloSearchResult {
  contacts: ApolloContact[];
  total: number;
}

export interface ApolloSettings {
  apiKey: string | null;
  apiKeyMasked: string | null;
  searchRoles: string[];
  availableRoles: { id: string; name: string }[];
}

export interface ApolloPermission {
  allowed: boolean;
  hasApiKey: boolean;
}
