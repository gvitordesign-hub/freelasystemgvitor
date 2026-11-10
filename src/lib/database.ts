
import { supabase } from './supabase';
import { getLocalDateString } from '../utils/dateUtils';
import { Client, Task, Transaction, Album, Service, Budget, Invoice, Reminder, UserStats, AppState, Holiday } from '../types';

const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
    }
    return user.id;
};

// ---------------------------------------------------------------
// Legado: antes das colunas existirem no Supabase, alguns valores
// ficavam apenas no localStorage / dentro do briefing. Estes helpers
// existem SOMENTE para enviar esses dados ao banco uma vez
// (Configurações → "Enviar dados locais para o banco").
// ---------------------------------------------------------------
const DELIVERABLES_REGEX = /\n?<!--GV_DELIVERABLES:[\s\S]*?-->/g;

export const extractDeliverablesFromBriefing = (briefing?: string): any[] | null => {
    if (!briefing) return null;
    const match = briefing.match(/<!--GV_DELIVERABLES:([\s\S]*?)-->/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[1]);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const cleanBriefing = (briefing?: string): string => {
    if (!briefing) return '';
    return briefing.replace(DELIVERABLES_REGEX, '').trim();
};

const readLocalJson = (key: string): Record<string, any> => {
    try {
        return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
        return {};
    }
};

export const getLegacyLocalData = () => ({
    customValues: readLocalJson('invoice_custom_values_cache') as Record<string, number | null>,
    deliverables: readLocalJson('task_deliverables_cache') as Record<string, any[]>
});

export const clearLegacyLocalData = () => {
    try {
        localStorage.removeItem('invoice_custom_values_cache');
        localStorage.removeItem('task_deliverables_cache');
    } catch { /* ignore */ }
};

// ---------------------------------------------------------------
// Mappers banco (snake_case) -> app (camelCase)
// ---------------------------------------------------------------
const mapTask = (t: any): Task => {
    const fromBriefing = extractDeliverablesFromBriefing(t.briefing);
    const deliverables = Array.isArray(t.deliverables) && t.deliverables.length > 0
        ? t.deliverables
        : (fromBriefing || []);
    return {
        ...t,
        clientId: t.client_id,
        invoiceId: t.invoice_id,
        addToPortfolio: t.add_to_portfolio,
        value: Number(t.value) || 0,
        position: t.position || 0,
        briefing: cleanBriefing(t.briefing),
        deliverables
    } as Task;
};

const mapTransaction = (t: any): Transaction => ({
    ...t,
    value: Number(t.value) || 0,
    taskId: t.task_id,
    invoiceId: t.invoice_id
}) as Transaction;

const mapInvoice = (i: any): Invoice => ({
    ...i,
    clientId: i.client_id,
    createdAt: i.created_at,
    paidAt: i.paid_at ?? null,
    customValue: i.custom_value !== undefined && i.custom_value !== null ? Number(i.custom_value) : null
}) as Invoice;

export const db = {
    // Clients
    clients: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('clients').select('*').eq('user_id', userId).order('created_at');
            if (error) throw error;
            return data as Client[];
        },
        async create(client: Omit<Client, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('clients').insert({ ...client, user_id: userId }).select().single();
            if (error) throw error;
            return data as Client;
        },
        async update(id: string, client: Partial<Client>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('clients').update(client).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return data as Client;
        },
        async delete(id: string) {
            const userId = await getUserId();

            // 1. Unlink related tasks to prevent foreign key constraint violations
            try {
                await supabase.from('tasks').update({ client_id: null }).eq('client_id', id).eq('user_id', userId);
            } catch (err) {
                console.warn('Could not unlink tasks from client:', err);
            }

            // 2. Unlink related invoices to prevent foreign key constraint violations
            try {
                await supabase.from('invoices').update({ client_id: null }).eq('client_id', id).eq('user_id', userId);
            } catch (err) {
                console.warn('Could not unlink invoices from client:', err);
            }

            // 3. Remove budgets associated with this client
            try {
                await supabase.from('budgets').delete().eq('client_id', id).eq('user_id', userId);
            } catch (err) {
                console.warn('Could not delete client budgets:', err);
            }

            // 4. Delete the client itself
            const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', userId);
            if (error) {
                // Fallback for legacy records created before strict user isolation
                const fallback = await supabase.from('clients').delete().eq('id', id);
                if (fallback.error) throw fallback.error;
            }
        }
    },

    // Tasks
    tasks: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('position', { ascending: true });
            if (error) throw error;
            return data.map(mapTask);
        },
        async create(task: Omit<Task, 'id'>) {
            const userId = await getUserId();
            const dateStr = task.date ? (task.date.includes('T') ? task.date.split('T')[0] : task.date) : undefined;
            const payload: any = {
                title: task.title,
                client_id: task.clientId,
                invoice_id: task.invoiceId,
                value: task.value,
                day: task.day,
                date: dateStr,
                status: task.status,
                category: task.category,
                briefing: task.briefing,
                add_to_portfolio: task.addToPortfolio,
                position: task.position || 0,
                deliverables: task.deliverables ?? [],
                user_id: userId
            };
            const { data, error } = await supabase.from('tasks').insert(payload).select().single();
            if (error) throw error;
            return mapTask(data);
        },
        async update(id: string, task: Partial<Task>) {
            const userId = await getUserId();
            const transformed: any = { ...task };
            delete transformed.id;
            delete transformed.user_id;
            if (task.clientId !== undefined) { transformed.client_id = task.clientId; delete transformed.clientId; }
            if (task.invoiceId !== undefined) { transformed.invoice_id = task.invoiceId; delete transformed.invoiceId; }
            if (task.addToPortfolio !== undefined) { transformed.add_to_portfolio = task.addToPortfolio; delete transformed.addToPortfolio; }
            if (transformed.date && transformed.date.includes('T')) {
                transformed.date = transformed.date.split('T')[0];
            }

            Object.keys(transformed).forEach(k => {
                if (transformed[k] === undefined) delete transformed[k];
            });

            const { data, error } = await supabase.from('tasks').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return mapTask(data);
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // Transactions
    transactions: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false });
            if (error) throw error;
            return data.map(mapTransaction);
        },
        async findEntradaByTask(taskId: string) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('transactions').select('*')
                .eq('user_id', userId).eq('task_id', taskId).eq('type', 'Entrada').maybeSingle();
            if (error) throw error;
            return data ? mapTransaction(data) : null;
        },
        async create(tx: Omit<Transaction, 'id'>) {
            const userId = await getUserId();
            const dateStr = tx.date ? (tx.date.includes('T') ? tx.date.split('T')[0] : tx.date) : getLocalDateString();
            const payload: any = {
                description: tx.description,
                value: tx.value,
                type: tx.type,
                date: dateStr,
                status: tx.status,
                category: tx.category,
                task_id: tx.taskId,
                invoice_id: tx.invoiceId,
                method: tx.method,
                user_id: userId
            };
            Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
            const { data, error } = await supabase.from('transactions').insert(payload).select().single();
            if (error) throw error;
            return mapTransaction(data);
        },
        async update(id: string, tx: Partial<Transaction>) {
            const userId = await getUserId();
            const transformed: any = { ...tx };
            delete transformed.id;
            delete transformed.user_id;
            if (tx.taskId !== undefined) { transformed.task_id = tx.taskId; delete transformed.taskId; }
            if (tx.invoiceId !== undefined) { transformed.invoice_id = tx.invoiceId; delete transformed.invoiceId; }
            if (transformed.date && transformed.date.includes('T')) {
                transformed.date = transformed.date.split('T')[0];
            }
            Object.keys(transformed).forEach(k => {
                if (transformed[k] === undefined) delete transformed[k];
            });

            const { data, error } = await supabase.from('transactions').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return mapTransaction(data);
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // Services
    services: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('services').select('*').eq('user_id', userId).order('name');
            if (error) throw error;
            return data.map(s => ({ ...s, baseValue: s.base_value })) as Service[];
        },
        async create(service: Omit<Service, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('services').insert({
                name: service.name,
                description: service.description,
                base_value: service.baseValue,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, baseValue: data.base_value } as Service;
        },
        async update(id: string, service: Partial<Service>) {
            const userId = await getUserId();
            const transformed: any = { ...service };
            if (service.baseValue !== undefined) { transformed.base_value = service.baseValue; delete transformed.baseValue; }
            const { data, error } = await supabase.from('services').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return { ...data, baseValue: data.base_value } as Service;
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('services').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // Invoices
    invoices: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(mapInvoice);
        },
        async create(invoice: Omit<Invoice, 'id'>) {
            const userId = await getUserId();
            const payload: any = {
                client_id: invoice.clientId,
                title: invoice.title,
                status: invoice.status,
                notes: invoice.notes,
                user_id: userId
            };
            if (invoice.customValue !== undefined && invoice.customValue !== null) payload.custom_value = invoice.customValue;
            if (invoice.paidAt !== undefined) payload.paid_at = invoice.paidAt;

            const { data, error } = await supabase.from('invoices').insert(payload).select().single();
            if (error) throw error;
            return mapInvoice(data);
        },
        /** Atualiza apenas campos de cadastro. Pagamento/reabertura usam pay()/reopen(). */
        async update(id: string, invoice: Partial<Invoice> & Record<string, any>) {
            const userId = await getUserId();
            const transformed: any = {};
            if (invoice.title !== undefined) transformed.title = invoice.title;
            if (invoice.notes !== undefined) transformed.notes = invoice.notes;

            const clientId = invoice.clientId ?? invoice.client_id;
            if (clientId !== undefined) transformed.client_id = clientId;

            const createdAt = invoice.createdAt ?? invoice.created_at;
            if (createdAt !== undefined) transformed.created_at = createdAt;

            const customValue = invoice.customValue !== undefined ? invoice.customValue : invoice.custom_value;
            if (customValue !== undefined) transformed.custom_value = customValue;

            const { data, error } = await supabase.from('invoices').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return mapInvoice(data);
        },
        /** Quita a nota, conclui as tarefas e lança no caixa — tudo numa transação no banco. */
        async pay(id: string, paidAt: string = getLocalDateString(), method?: string) {
            const { error } = await supabase.rpc('pay_invoice', {
                p_invoice_id: id,
                p_paid_at: paidAt,
                p_method: method ?? null
            });
            if (error) throw error;
        },
        /** True se todas as tarefas com valor da nota já têm entrada paga (consulta fresca ao banco). */
        async isFullyReceived(id: string) {
            const userId = await getUserId();
            const { data: invTasks, error: e1 } = await supabase.from('tasks').select('id,value').eq('invoice_id', id).eq('user_id', userId);
            if (e1) throw e1;
            const billable = (invTasks || []).filter(t => Number(t.value) > 0);
            if (billable.length === 0) return false;
            const { data: txs, error: e2 } = await supabase.from('transactions').select('task_id')
                .eq('user_id', userId).eq('type', 'Entrada').eq('status', 'Pago').in('task_id', billable.map(t => t.id));
            if (e2) throw e2;
            const paid = new Set((txs || []).map(t => t.task_id));
            return billable.every(t => paid.has(t.id));
        },
        /** Volta a nota e os lançamentos vinculados para Pendente. */
        async reopen(id: string) {
            const { error } = await supabase.rpc('reopen_invoice', { p_invoice_id: id });
            if (error) throw error;
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // User Settings (Stats)
    settings: {
        async get() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;
            if (!data) return null;
            return {
                ...data,
                weeklyGoal: data.weekly_goal,
                monthlyGoal: data.monthly_goal,
                annualGoal: data.annual_goal,
                taskGoal: data.task_goal,
                clientGoal: data.client_goal,
                lastActive: data.last_active,
                lastBriefingDate: data.last_briefing_date,
                pixKey: data.pix_key,
                themeColor: data.theme_color,
                portfolioLogo: data.portfolio_logo,
                portfolioFavicon: data.portfolio_favicon,
                behanceLink: data.behance_link,
                instagramLink: data.instagram_link,
                portfolioCategories: data.portfolio_categories,
                socialLinks: data.social_links,
                overdueAlertDays: data.overdue_alert_days
            } as UserStats;
        },
        async update(stats: Partial<UserStats>) {
            const userId = await getUserId();
            const transformed: any = { ...stats };
            const mapping: Record<string, string> = {
                weeklyGoal: 'weekly_goal',
                monthlyGoal: 'monthly_goal',
                annualGoal: 'annual_goal',
                taskGoal: 'task_goal',
                clientGoal: 'client_goal',
                lastActive: 'last_active',
                lastBriefingDate: 'last_briefing_date',
                pixKey: 'pix_key',
                themeColor: 'theme_color',
                portfolioLogo: 'portfolio_logo',
                portfolioFavicon: 'portfolio_favicon',
                behanceLink: 'behance_link',
                instagramLink: 'instagram_link',
                portfolioCategories: 'portfolio_categories',
                socialLinks: 'social_links',
                overdueAlertDays: 'overdue_alert_days'
            };

            Object.keys(mapping).forEach(key => {
                if (stats[key as keyof UserStats] !== undefined) {
                    transformed[mapping[key]] = stats[key as keyof UserStats];
                    delete transformed[key];
                }
            });

            const { data, error } = await supabase.from('user_settings')
                .upsert({ ...transformed, user_id: userId }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // Reminders
    reminders: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('reminders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(r => ({ ...r, linkedTaskId: r.linked_task_id, alertBefore: r.alert_before })) as Reminder[];
        },
        async create(reminder: Omit<Reminder, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('reminders').insert({
                text: reminder.text,
                type: reminder.type,
                completed: reminder.completed,
                linked_task_id: reminder.linkedTaskId,
                date: reminder.date,
                time: reminder.time,
                alert_before: reminder.alertBefore,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, linkedTaskId: data.linked_task_id, alertBefore: data.alert_before } as Reminder;
        },
        async update(id: string, reminder: Partial<Reminder>) {
            const userId = await getUserId();
            const transformed: any = { ...reminder };
            if (reminder.linkedTaskId !== undefined) { transformed.linked_task_id = reminder.linkedTaskId; delete transformed.linkedTaskId; }
            if (reminder.alertBefore !== undefined) { transformed.alert_before = reminder.alertBefore; delete transformed.alertBefore; }
            const { data, error } = await supabase.from('reminders').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return { ...data, linkedTaskId: data.linked_task_id, alertBefore: data.alert_before } as Reminder;
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // Budgets
    budgets: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('budgets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(b => ({ ...b, clientId: b.client_id, discountType: b.discount_type, downPayment: b.down_payment, validityDays: b.validity_days, createdAt: b.created_at })) as Budget[];
        },
        async create(budget: Omit<Budget, 'id' | 'createdAt'> & { createdAt?: string }) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('budgets').insert({
                client_id: budget.clientId,
                items: budget.items,
                discount: budget.discount,
                discount_type: budget.discountType,
                down_payment: budget.downPayment,
                validity_days: budget.validityDays,
                terms: budget.terms,
                status: budget.status,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, discountType: data.discount_type, downPayment: data.down_payment, validityDays: data.validity_days, createdAt: data.created_at } as Budget;
        },
        async update(id: string, budget: Partial<Budget>) {
            const userId = await getUserId();
            const transformed: any = { ...budget };
            delete transformed.id;
            delete transformed.user_id;
            if (budget.clientId !== undefined) { transformed.client_id = budget.clientId; delete transformed.clientId; }
            if (budget.discountType !== undefined) { transformed.discount_type = budget.discountType; delete transformed.discountType; }
            if (budget.downPayment !== undefined) { transformed.down_payment = budget.downPayment; delete transformed.downPayment; }
            if (budget.validityDays !== undefined) { transformed.validity_days = budget.validityDays; delete transformed.validityDays; }
            const { data, error } = await supabase.from('budgets').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, discountType: data.discount_type, downPayment: data.down_payment, validityDays: data.validity_days, createdAt: data.created_at } as Budget;
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // Albums/Portfolio
    albums: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('albums').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(a => ({ ...a, coverImage: a.cover_image, createdAt: a.created_at, assets: a.assets || [] })) as Album[];
        },
        async create(album: Omit<Album, 'id'>) {
            const userId = await getUserId();
            const payload: any = {
                title: album.title,
                category: album.category,
                cover_image: album.coverImage,
                user_id: userId
            };
            const { data, error } = await supabase.from('albums').insert(payload).select().single();
            if (error) throw error;
            return { ...data, coverImage: data.cover_image, createdAt: data.created_at, assets: album.assets || [] } as Album;
        }
    },

    // Holidays
    holidays: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('holidays').select('*').eq('user_id', userId).order('date', { ascending: true });
            if (error) throw error;
            return data as Holiday[];
        },
        async create(holiday: Omit<Holiday, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('holidays').insert({
                date: holiday.date,
                description: holiday.description,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return data as Holiday;
        },
        async bulkCreate(holidaysList: Omit<Holiday, 'id'>[]) {
            const userId = await getUserId();
            const rows = holidaysList.map(h => ({
                date: h.date,
                description: h.description,
                user_id: userId
            }));
            const { data, error } = await supabase.from('holidays').upsert(rows, { onConflict: 'date,user_id' }).select();
            if (error) throw error;
            return data as Holiday[];
        },
        async delete(id: string) {
            const userId = await getUserId();
            const { error } = await supabase.from('holidays').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    }
};
