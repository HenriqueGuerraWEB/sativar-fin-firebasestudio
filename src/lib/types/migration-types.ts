
import { z } from 'zod';
import { ClientSchema } from './client-types';
import { PlanSchema } from './plan-types';
import { InvoiceSchema } from './invoice-types';
import { ExpenseSchema } from './expense-types';
import { ExpenseCategorySchema } from './expense-category-types';
import { KnowledgeBaseArticleSchema } from './knowledge-base-types';
import { TaskSchema } from './task-types';

const CompanySettingsSchema = z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string(),
    website: z.string(),
    logoDataUrl: z.string(),
    cpf: z.string(),
    cnpj: z.string(),
});

// Input schema for the migration flow
export const DataMigrationInputSchema = z.object({
    clients: z.array(ClientSchema).optional(),
    plans: z.array(PlanSchema).optional(),
    invoices: z.array(InvoiceSchema).optional(),
    expenses: z.array(ExpenseSchema).optional(),
    expenseCategories: z.array(ExpenseCategorySchema).optional(),
    knowledgeBaseArticles: z.array(KnowledgeBaseArticleSchema).optional(),
    tasks: z.array(TaskSchema).optional(),
    settings: CompanySettingsSchema.optional(),
});
export type DataMigrationInput = z.infer<typeof DataMigrationInputSchema>;


// Output schema for the migration flow
export const DataMigrationOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    clientsMigrated: z.number(),
    plansMigrated: z.number(),
    invoicesMigrated: z.number(),
    expensesMigrated: z.number(),
    categoriesMigrated: z.number(),
    knowledgeBaseArticlesMigrated: z.number(),
    tasksMigrated: z.number(),
});
export type DataMigrationOutput = z.infer<typeof DataMigrationOutputSchema>;
