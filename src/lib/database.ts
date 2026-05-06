
import { supabase } from './supabase';
import { Client, Task, Transaction, Album, Service, Budget, Invoice, Reminder, UserStats, AppState } from '../types';

// Fallback for development/bypassing login
const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '00000000-0000-0000-0000-000000000000';
};

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
            const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', userId);
            if (error) throw error;
        }
    },

    // Tasks
    tasks: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('position', { ascending: true });
            if (error) throw error;
            return data.map(t => ({
                ...t,
                clientId: t.client_id,
                invoiceId: t.invoice_id,
                addToPortfolio: t.add_to_portfolio,
                position: t.position || 0
            })) as Task[];
        },
        async create(task: Omit<Task, 'id'>) {
            const userId = await getUserId();
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
                add_to_portfolio: task.addToPortfolio,
                position: task.position || 0,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, invoiceId: data.invoice_id, addToPortfolio: data.add_to_portfolio, position: data.position } as Task;
        },
        async update(id: string, task: Partial<Task>) {
            const userId = await getUserId();
            const transformed: any = { ...task };
            if (task.clientId !== undefined) { transformed.client_id = task.clientId; delete transformed.clientId; }
            if (task.invoiceId !== undefined) { transformed.invoice_id = task.invoiceId; delete transformed.invoiceId; }
            if (task.addToPortfolio !== undefined) { transformed.add_to_portfolio = task.addToPortfolio; delete transformed.addToPortfolio; }

            const { data, error } = await supabase.from('tasks').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, invoiceId: data.invoice_id, addToPortfolio: data.add_to_portfolio, position: data.position } as Task;
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
            return data.map(t => ({ ...t, taskId: t.task_id })) as Transaction[];
        },
        async create(tx: Omit<Transaction, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('transactions').insert({
                description: tx.description,
                value: tx.value,
                type: tx.type,
                date: tx.date,
                status: tx.status,
                category: tx.category,
                task_id: tx.taskId,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, taskId: data.task_id } as Transaction;
        },
        async update(id: string, tx: Partial<Transaction>) {
            const userId = await getUserId();
            const transformed: any = { ...tx };
            if (tx.taskId !== undefined) { transformed.task_id = tx.taskId; delete transformed.taskId; }
            const { data, error } = await supabase.from('transactions').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return { ...data, taskId: data.task_id } as Transaction;
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
            return data.map(i => ({ ...i, clientId: i.client_id, createdAt: i.created_at })) as Invoice[];
        },
        async create(invoice: Omit<Invoice, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('invoices').insert({
                client_id: invoice.clientId,
                title: invoice.title,
                status: invoice.status,
                notes: invoice.notes,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, createdAt: data.created_at } as Invoice;
        },
        async update(id: string, invoice: Partial<Invoice>) {
            const userId = await getUserId();
            const transformed: any = { ...invoice };
            if (invoice.clientId !== undefined) { transformed.client_id = invoice.clientId; delete transformed.clientId; }
            if (invoice.createdAt !== undefined) { transformed.created_at = invoice.createdAt; delete transformed.createdAt; }
            const { data, error } = await supabase.from('invoices').update(transformed).eq('id', id).eq('user_id', userId).select().single();
            if (error) throw error;
            return { ...data, clientId: data.client_id, createdAt: data.created_at } as Invoice;
        },
        async delete(id: string) {
            await supabase.from('invoices').delete().eq('id', id);
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
            await supabase.from('reminders').delete().eq('id', id);
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
        async create(budget: Omit<Budget, 'id'>) {
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
        }
    },

    // Albums/Portfolio
    albums: {
        async list() {
            const userId = await getUserId();
            const { data, error } = await supabase.from('albums').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(a => ({ ...a, coverImage: a.cover_image, createdAt: a.created_at })) as Album[];
        },
        async create(album: Omit<Album, 'id'>) {
            const userId = await getUserId();
            const { data, error } = await supabase.from('albums').insert({
                title: album.title,
                category: album.category,
                cover_image: album.coverImage,
                assets: album.assets,
                user_id: userId
            }).select().single();
            if (error) throw error;
            return { ...data, coverImage: data.cover_image, createdAt: data.created_at } as Album;
        }
    }
};
