
"use client";

import type { Storable } from './storage-service';
// Import your Genkit flows here
import { 
    getPlans, 
    addPlan, 
    updatePlan,
    deletePlan,
} from '@/ai/flows/plans-flow';
import {
    getClients,
    addClient as addClientFlow,
    updateClient,
    deleteClient,
} from '@/ai/flows/clients-flow';
import {
    getInvoices,
    addInvoices,
    updateInvoice,
    deleteInvoice,
    deleteInvoices,
} from '@/ai/flows/invoices-flow';
import {
    getExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
} from '@/ai/flows/expenses-flow';
import {
    getExpenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
} from '@/ai/flows/expense-categories-flow';
import { migrateData } from '@/ai/flows/data-migration-flow';

import type { Plan, AddPlanInput, UpdatePlanInput } from '@/lib/types/plan-types';
import type { Client, AddClientInput, UpdateClientInput } from '@/lib/types/client-types';
import type { Invoice, AddInvoiceInput, UpdateInvoiceInput } from '@/lib/types/invoice-types';
import type { Expense, AddExpenseInput, UpdateExpenseInput } from '@/lib/types/expense-types';
import type { ExpenseCategory, AddExpenseCategoryInput, UpdateExpenseCategoryInput } from '@/lib/types/expense-category-types';


/**
 * ApiService
 * This service acts as the client-side adapter for database operations.
 * It mirrors the interface of the LocalStorageService but calls backend API endpoints (Genkit flows).
 */
export const ApiService = {
    getCollection: async <T extends Storable>(collectionKey: string): Promise<T[]> => {
        console.log(`ApiService: Fetching collection ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                return await getPlans() as T[];
            case 'clients':
                 return await getClients() as T[];
            case 'invoices':
                return await getInvoices() as T[];
            case 'expenses':
                return await getExpenses() as T[];
            case 'expenseCategories':
                return await getExpenseCategories() as T[];
            default:
                console.warn(`ApiService: No getCollection handler for ${collectionKey}`);
                return Promise.resolve([]);
        }
    },

    setCollection: async (collectionKey: string, data: any): Promise<void> => {
        console.log(`ApiService: Setting collection ${collectionKey}...`);
        // This would likely be a bulk-update or migration endpoint.
        if (collectionKey === 'migrate-all') {
            return await migrateData(data);
        }
        return Promise.resolve();
    },

    getItem: async <T extends Storable>(collectionKey: string, itemId: string): Promise<T | null> => {
        console.log(`ApiService: Fetching item ${itemId} from ${collectionKey}...`);
        // This is inefficient. It's better to create specific `getItem` flows.
        const collection = await ApiService.getCollection<T>(collectionKey);
        return Promise.resolve(collection.find(item => item.id === itemId) || null);
    },

    addItem: async <T extends Storable>(collectionKey: string, itemData: Omit<T, 'id'>): Promise<T> => {
        console.log(`ApiService: Adding item to ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                return await addPlan(itemData as AddPlanInput) as T;
            case 'clients':
                return await addClientFlow(itemData as AddClientInput) as T;
            case 'invoices':
                // Note: The invoices flow supports adding multiple invoices. This is a single add for consistency.
                const newInvoices = await addInvoices([itemData as AddInvoiceInput]);
                return newInvoices[0] as T;
            case 'expenses':
                return await addExpense(itemData as AddExpenseInput) as T;
            case 'expenseCategories':
                return await addExpenseCategory(itemData as AddExpenseCategoryInput) as T;
            default:
                console.warn(`ApiService: No addItem handler for ${collectionKey}`);
                return Promise.resolve({ ...itemData, id: 'temp-api-id' } as T);
        }
    },

    addItems: async <T extends Storable>(collectionKey: string, itemsData: Omit<T, 'id'>[]): Promise<T[]> => {
        console.log(`ApiService: Adding multiple items to ${collectionKey}...`);
         switch (collectionKey) {
            case 'invoices':
                return await addInvoices(itemsData as any[]) as T[];
            default:
                const results = await Promise.all(itemsData.map(item => ApiService.addItem<T>(collectionKey, item)));
                return results;
        }
    },

    updateItem: async <T extends Storable>(collectionKey: string, itemId: string, updates: Partial<Omit<T, 'id'>>): Promise<T | null> => {
        console.log(`ApiService: Updating item ${itemId} in ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                const planInput: UpdatePlanInput = { planId: itemId, updates: updates as Partial<Plan> };
                return await updatePlan(planInput) as T | null;
            case 'clients':
                 const clientInput: UpdateClientInput = { clientId: itemId, updates: updates as Partial<Client> };
                 return await updateClient(clientInput) as T | null;
            case 'invoices':
                 const invoiceInput: UpdateInvoiceInput = { invoiceId: itemId, updates: updates as Partial<Invoice> };
                 return await updateInvoice(invoiceInput) as T | null;
            case 'expenses':
                 const expenseInput: UpdateExpenseInput = { expenseId: itemId, updates: updates as Partial<Expense> };
                 return await updateExpense(expenseInput) as T | null;
            case 'expenseCategories':
                const categoryInput: UpdateExpenseCategoryInput = { categoryId: itemId, updates: updates as Partial<ExpenseCategory> };
                return await updateExpenseCategory(categoryInput) as T | null;
            default:
                 console.warn(`ApiService: No updateItem handler for ${collectionKey}`);
                 return Promise.resolve(null);
        }
    },

    deleteItem: async (collectionKey: string, itemId: string): Promise<void> => {
        console.log(`ApiService: Deleting item ${itemId} from ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                return await deletePlan(itemId);
             case 'clients':
                return await deleteClient(itemId);
            case 'invoices':
                return await deleteInvoice(itemId);
            case 'expenses':
                return await deleteExpense(itemId);
            case 'expenseCategories':
                return await deleteExpenseCategory(itemId);
            default:
                console.warn(`ApiService: No deleteItem handler for ${collectionKey}`);
                return Promise.resolve();
        }
    },

    deleteItems: async (collectionKey: string, itemIds: string[]): Promise<void> => {
        console.log(`ApiService: Deleting multiple items from ${collectionKey}...`);
        switch(collectionKey) {
            case 'invoices':
                return await deleteInvoices({ invoiceIds: itemIds });
            default:
                await Promise.all(itemIds.map(id => ApiService.deleteItem(collectionKey, id)));
                return Promise.resolve();
        }
    },
};
