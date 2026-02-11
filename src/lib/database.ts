import { supabase } from './supabase';
import { Client, Task, Transaction, Album, Service, Budget, Invoice, Reminder, UserStats, AppState } from '../types';

export const db = {
    // Clients
    clients: {
        async list() {
            const { data, error } = await supabase.from('clients').select('*').order('created_at');
            if (error) throw error;
            return data as Client[];
        },
        async create(client: Omit<Client, 'id'>) {
            const { data, error } = await supabase.from('clients').insert(client).select().single();
            if (error) throw error;
            return data as Client;
        },
        async update(id: string, client: Partial<Client>) {
            const { data, error } = await supabase.from('clients').update(client).eq('id', id).select().single();
            if (error) throw error;
            return data as Client;
        },
        async delete(id: string) {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
        }
    },

    // Tasks
    tasks: {
        async list() {
            const { data, error } = await supabase.from('tasks').select('*').order('created_at');
            if (error) throw error;
            return data.map(t => ({
                ...t,
                clientId: t.client_id,
                invoiceId: t.invoice_id,
                addToPortfolio: t.add_to_portfolio
            })) as Task[];
        },
        async create(task: Omit<Task, 'id'>) {
            const { data, error } = await supabase.from('tasks').insert({
                title: task.title,
                client_id: task.clientId,
                invoice_id: task.invoiceId,
                value: task.value,
                day: task.day,
                date: task.date,
                status: task.status,
                category: task.category,
                briefing: task.briefing,
                add_to_portfolio: task.addToPortfolio
            }).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, invoiceId: data.invoice_id, addToPortfolio: data.add_to_portfolio } as Task;
        },
        async update(id: string, task: Partial<Task>) {
            const transformed: any = { ...task };
            if (task.clientId) transformed.client_id = task.clientId;
            if (task.invoiceId) transformed.invoice_id = task.invoiceId;
            if (task.addToPortfolio !== undefined) transformed.add_to_portfolio = task.addToPortfolio;

            const { data, error } = await supabase.from('tasks').update(transformed).eq('id', id).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, invoiceId: data.invoice_id, addToPortfolio: data.add_to_portfolio } as Task;
        },
        async delete(id: string) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        }
    },

    // Transactions
    transactions: {
        async list() {
            const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
            if (error) throw error;
            return data.map(t => ({ ...t, taskId: t.task_id })) as Transaction[];
        },
        async create(tx: Omit<Transaction, 'id'>) {
            const { data, error } = await supabase.from('transactions').insert({
                description: tx.description,
                value: tx.value,
                type: tx.type,
                date: tx.date,
                status: tx.status,
                category: tx.category,
                task_id: tx.taskId
            }).select().single();
            if (error) throw error;
            return { ...data, taskId: data.task_id } as Transaction;
        },
        async update(id: string, tx: Partial<Transaction>) {
            const transformed: any = { ...tx };
            if (tx.taskId) transformed.task_id = tx.taskId;
            const { data, error } = await supabase.from('transactions').update(transformed).eq('id', id).select().single();
            if (error) throw error;
            return { ...data, taskId: data.task_id } as Transaction;
        }
    },

    // Services
    services: {
        async list() {
            const { data, error } = await supabase.from('services').select('*').order('name');
            if (error) throw error;
            return data.map(s => ({ ...s, baseValue: s.base_value })) as Service[];
        },
        async create(service: Omit<Service, 'id'>) {
            const { data, error } = await supabase.from('services').insert({
                name: service.name,
                description: service.description,
                base_value: service.baseValue
            }).select().single();
            if (error) throw error;
            return { ...data, baseValue: data.base_value } as Service;
        },
        async update(id: string, service: Partial<Service>) {
            const transformed: any = { ...service };
            if (service.baseValue) transformed.base_value = service.baseValue;
            const { data, error } = await supabase.from('services').update(transformed).eq('id', id).select().single();
            if (error) throw error;
            return { ...data, baseValue: data.base_value } as Service;
        },
        async delete(id: string) {
            const { error } = await supabase.from('services').delete().eq('id', id);
            if (error) throw error;
        }
    },

    // Invoices
    invoices: {
        async list() {
            const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(i => ({ ...i, clientId: i.client_id })) as Invoice[];
        },
        async create(invoice: Omit<Invoice, 'id'>) {
            const { data, error } = await supabase.from('invoices').insert({
                client_id: invoice.clientId,
                title: invoice.title,
                status: invoice.status,
                notes: invoice.notes
            }).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id } as Invoice;
        },
        async update(id: string, invoice: Partial<Invoice>) {
            const transformed: any = { ...invoice };
            if (invoice.clientId) transformed.client_id = invoice.clientId;
            const { data, error } = await supabase.from('invoices').update(transformed).eq('id', id).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id } as Invoice;
        },
        async delete(id: string) {
            const { error } = await supabase.from('invoices').delete().eq('id', id);
            if (error) throw error;
        }
    },

    // User Settings (Stats)
    settings: {
        async get() {
            // Get current user to ensure we only get THEIR settings
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase.from('user_settings')
                .select('*')
                .eq('user_id', user.id)
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
                socialLinks: data.social_links
            } as UserStats;
        },
        async update(stats: Partial<UserStats>) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const transformed: any = { ...stats };
            // Map camelCase to snake_case for Supabase
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
                socialLinks: 'social_links'
            };

            Object.keys(mapping).forEach(key => {
                if (stats[key as keyof UserStats] !== undefined) {
                    transformed[mapping[key]] = stats[key as keyof UserStats];
                    delete transformed[key];
                }
            });

            const { data, error } = await supabase.from('user_settings')
                .upsert({ ...transformed, user_id: user.id }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // Reminders
    reminders: {
        async list() {
            const { data, error } = await supabase.from('reminders').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(r => ({ ...r, linkedTaskId: r.linked_task_id, alertBefore: r.alert_before })) as Reminder[];
        },
        async create(reminder: Omit<Reminder, 'id'>) {
            const { data, error } = await supabase.from('reminders').insert({
                text: reminder.text,
                type: reminder.type,
                completed: reminder.completed,
                linked_task_id: reminder.linkedTaskId,
                date: reminder.date,
                time: reminder.time,
                alert_before: reminder.alertBefore
            }).select().single();
            if (error) throw error;
            return { ...data, linkedTaskId: data.linked_task_id, alertBefore: data.alert_before } as Reminder;
        },
        async update(id: string, reminder: Partial<Reminder>) {
            const transformed: any = { ...reminder };
            if (reminder.linkedTaskId) transformed.linked_task_id = reminder.linkedTaskId;
            if (reminder.alertBefore !== undefined) transformed.alert_before = reminder.alertBefore;
            const { data, error } = await supabase.from('reminders').update(transformed).eq('id', id).select().single();
            if (error) throw error;
            return { ...data, linkedTaskId: data.linked_task_id, alertBefore: data.alert_before } as Reminder;
        },
        async delete(id: string) {
            const { error } = await supabase.from('reminders').delete().eq('id', id);
            if (error) throw error;
        }
    }
};
