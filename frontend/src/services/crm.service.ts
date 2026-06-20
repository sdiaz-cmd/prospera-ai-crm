import api from './api';
import type { Lead, Contact, Account, Opportunity, KanbanData, Activity, CrmTask, LeadStats, Quote, QuoteStats, Supplier, Product, ProductStats, Invoice, InvoiceStats, ApiResponse, ApolloContact, ApolloSearchResult, ApolloSettings, ApolloPermission } from '@/types';

// ─── Leads ────────────────────────────────────────────────────────

export const leadsService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ leads: Lead[]; meta: unknown }>>('/leads', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
    return res.data.data!;
  },
  async getStats() {
    const res = await api.get<ApiResponse<LeadStats>>('/leads/stats');
    return res.data.data!;
  },
  async create(data: Partial<Lead>) {
    const res = await api.post<ApiResponse<Lead>>('/leads', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Lead>) {
    const res = await api.put<ApiResponse<Lead>>(`/leads/${id}`, data);
    return res.data.data!;
  },
  async convert(id: string) {
    const res = await api.patch<ApiResponse<Lead>>(`/leads/${id}/convert`);
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/leads/${id}`);
  },
  async import(csvContent: string, assigneeId?: string) {
    const res = await api.post('/leads/import', { csvContent, assigneeId });
    return res.data.data as { imported: number; duplicates: number; errors: { row: number; message: string }[] };
  },
  async export() {
    const res = await api.get('/leads/export', { responseType: 'blob' });
    return res.data as Blob;
  },
};

// ─── Contacts ─────────────────────────────────────────────────────

export const contactsService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ contacts: Contact[]; meta: unknown }>>('/contacts', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Contact>>(`/contacts/${id}`);
    return res.data.data!;
  },
  async create(data: Partial<Contact>) {
    const res = await api.post<ApiResponse<Contact>>('/contacts', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Contact>) {
    const res = await api.put<ApiResponse<Contact>>(`/contacts/${id}`, data);
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/contacts/${id}`);
  },
  async import(csvContent: string, assigneeId?: string) {
    const res = await api.post('/contacts/import', { csvContent, assigneeId });
    return res.data.data as { imported: number; duplicates: number; errors: { row: number; message: string }[] };
  },
  async export() {
    const res = await api.get('/contacts/export', { responseType: 'blob' });
    return res.data as Blob;
  },
};

// ─── Accounts ─────────────────────────────────────────────────────

export const accountsService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ accounts: Account[]; meta: unknown }>>('/accounts', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Account>>(`/accounts/${id}`);
    return res.data.data!;
  },
  async create(data: Partial<Account>) {
    const res = await api.post<ApiResponse<Account>>('/accounts', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Account>) {
    const res = await api.put<ApiResponse<Account>>(`/accounts/${id}`, data);
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/accounts/${id}`);
  },
};

// ─── Opportunities ────────────────────────────────────────────────

export const opportunitiesService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ opportunities: Opportunity[]; meta: unknown }>>('/opportunities', { params });
    return res.data.data!;
  },
  async getKanban() {
    const res = await api.get<ApiResponse<KanbanData>>('/opportunities/kanban');
    return res.data.data!;
  },
  async getStats() {
    const res = await api.get<ApiResponse<{ open: { count: number; value: number }; won: { count: number; value: number }; lost: { count: number } }>>('/opportunities/stats');
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Opportunity>>(`/opportunities/${id}`);
    return res.data.data!;
  },
  async create(data: Partial<Opportunity>) {
    const res = await api.post<ApiResponse<Opportunity>>('/opportunities', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Opportunity>) {
    const res = await api.put<ApiResponse<Opportunity>>(`/opportunities/${id}`, data);
    return res.data.data!;
  },
  async moveStage(id: string, stageId: string) {
    const res = await api.patch<ApiResponse<Opportunity>>(`/opportunities/${id}/stage`, { stageId });
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/opportunities/${id}`);
  },
};

// ─── Activities ───────────────────────────────────────────────────

export const activitiesService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ activities: Activity[]; meta: unknown }>>('/activities', { params });
    return res.data.data!;
  },
  async create(data: Partial<Activity>) {
    const res = await api.post<ApiResponse<Activity>>('/activities', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Activity>) {
    const res = await api.put<ApiResponse<Activity>>(`/activities/${id}`, data);
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/activities/${id}`);
  },
};

// ─── Tasks ────────────────────────────────────────────────────────

export const tasksService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ tasks: CrmTask[]; meta: unknown }>>('/tasks', { params });
    return res.data.data!;
  },
  async create(data: Partial<CrmTask>) {
    const res = await api.post<ApiResponse<CrmTask>>('/tasks', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<CrmTask>) {
    const res = await api.put<ApiResponse<CrmTask>>(`/tasks/${id}`, data);
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/tasks/${id}`);
  },
};

// ─── Quotes ───────────────────────────────────────────────────────

export const quotesService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ quotes: Quote[]; meta: unknown }>>('/quotes', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Quote>>(`/quotes/${id}`);
    return res.data.data!;
  },
  async getStats() {
    const res = await api.get<ApiResponse<QuoteStats>>('/quotes/stats');
    return res.data.data!;
  },
  async create(data: Partial<Quote>) {
    const res = await api.post<ApiResponse<Quote>>('/quotes', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Quote>) {
    const res = await api.put<ApiResponse<Quote>>(`/quotes/${id}`, data);
    return res.data.data!;
  },
  async changeStatus(id: string, status: string) {
    const res = await api.patch<ApiResponse<Quote>>(`/quotes/${id}/status`, { status });
    return res.data.data!;
  },
  async delete(id: string) {
    await api.delete(`/quotes/${id}`);
  },
};

// ─── Suppliers ────────────────────────────────────────────────────

export const suppliersService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ suppliers: Supplier[]; meta: unknown }>>('/suppliers', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return res.data.data!;
  },
  async create(data: Partial<Supplier>) {
    const res = await api.post<ApiResponse<Supplier>>('/suppliers', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Supplier>) {
    const res = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return res.data.data!;
  },
  async delete(id: string) { await api.delete(`/suppliers/${id}`); },
};

// ─── Products ─────────────────────────────────────────────────────

export const productsService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ products: Product[]; meta: unknown; categories: string[] }>>('/products', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return res.data.data!;
  },
  async getStats() {
    const res = await api.get<ApiResponse<ProductStats>>('/products/stats');
    return res.data.data!;
  },
  async create(data: Partial<Product>) {
    const res = await api.post<ApiResponse<Product>>('/products', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Product>) {
    const res = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
    return res.data.data!;
  },
  async adjustStock(id: string, type: string, quantity: number, reference?: string, notes?: string) {
    const res = await api.patch<ApiResponse<Product>>(`/products/${id}/stock`, { type, quantity, reference, notes });
    return res.data.data!;
  },
  async delete(id: string) { await api.delete(`/products/${id}`); },
};

// ─── Invoices ─────────────────────────────────────────────────────

export const invoicesService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await api.get<ApiResponse<{ invoices: Invoice[]; meta: unknown }>>('/invoices', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return res.data.data!;
  },
  async getStats() {
    const res = await api.get<ApiResponse<InvoiceStats>>('/invoices/stats');
    return res.data.data!;
  },
  async create(data: Partial<Invoice>) {
    const res = await api.post<ApiResponse<Invoice>>('/invoices', data);
    return res.data.data!;
  },
  async update(id: string, data: Partial<Invoice>) {
    const res = await api.put<ApiResponse<Invoice>>(`/invoices/${id}`, data);
    return res.data.data!;
  },
  async changeStatus(id: string, status: string) {
    const res = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}/status`, { status });
    return res.data.data!;
  },
  async delete(id: string) { await api.delete(`/invoices/${id}`); },
};

// ─── Apollo ───────────────────────────────────────────────────────

export const apolloService = {
  async checkPermission() {
    const res = await api.get<ApiResponse<ApolloPermission>>('/apollo/can-search');
    return res.data.data!;
  },
  async getSettings() {
    const res = await api.get<ApiResponse<ApolloSettings>>('/apollo/settings');
    return res.data.data!;
  },
  async saveSettings(data: { apiKey?: string; searchRoles?: string[] }) {
    const res = await api.put<ApiResponse<ApolloSettings>>('/apollo/settings', data);
    return res.data.data!;
  },
  async search(params: {
    name?: string; title?: string; organization?: string;
    location?: string; industry?: string; page?: number; perPage?: number;
  }) {
    const res = await api.post<ApiResponse<ApolloSearchResult>>('/apollo/search', params);
    return res.data.data!;
  },
  async import(contacts: ApolloContact[]) {
    const res = await api.post<ApiResponse<{ imported: number; skipped: number }>>('/apollo/import', { contacts });
    return res.data;
  },
};
