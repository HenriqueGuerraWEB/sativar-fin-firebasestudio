
import { z } from 'zod';

// Schemas for data structures from localStorage

const ClientPlanSchema = z.object({
  planId: z.string(),
  planActivationDate: z.date(),
});

const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  taxId: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  notes: z.string(),
  status: z.enum(["Ativo", "Inativo"]),
  plans: z.array(ClientPlanSchema),
  createdAt: z.date(),
});

const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  type: z.enum(['recurring', 'one-time']),
  recurrenceValue: z.number().optional().nullable(),
  recurrencePeriod: z.enum(['dias', 'meses', 'anos']).optional().nullable(),
});

const InvoiceSchema = z.object({
    id: z.string(),
    clientName: z.string(),
    clientId: z.string(),
    amount: z.number(),
    issueDate: z.date(),
    dueDate: z.date(),
    status: z.enum(['Paga', 'Pendente', 'Vencida']),
    planId: z.string(),
    planName: z.string().optional(),
    paymentDate: z.date().optional(),
    paymentMethod: z.enum(['Pix', 'Cartão de Crédito', 'Cartão de Débito']).optional(),
    paymentNotes: z.string().optional(),
});

const ExpenseSchema = z.object({
    id: z.string(),
    description: z.string(),
    category: z.string(),
    amount: z.number(),
    dueDate: z.date(),
    status: z.enum(['Paga', 'Pendente']),
});

const ExpenseCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
});

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
});
export type DataMigrationOutput = z.infer<typeof DataMigrationOutputSchema>;

    