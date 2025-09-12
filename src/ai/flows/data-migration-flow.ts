
'use server';
/**
 * @fileOverview A flow for migrating user data from localStorage to the database.
 * 
 * - migrateData - A function that handles the data migration process.
 * - DataMigrationInput - The input type for the migrateData function.
 * - DataMigrationOutput - The return type for the migrateData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';


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
  recurrenceValue: z.number().optional(),
  recurrencePeriod: z.enum(['dias', 'meses', 'anos']).optional(),
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
    clients: z.array(ClientSchema),
    plans: z.array(PlanSchema),
    invoices: z.array(InvoiceSchema),
    expenses: z.array(ExpenseSchema),
    expenseCategories: z.array(ExpenseCategorySchema),
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


/**
 * Migrates data from localStorage to the database.
 * This is the entry point for the data migration flow.
 * @param input The data to be migrated.
 * @returns The result of the migration.
 */
export async function migrateData(input: DataMigrationInput): Promise<DataMigrationOutput> {
  return await migrateDataFlow(input);
}


const migrateDataFlow = ai.defineFlow(
  {
    name: 'migrateDataFlow',
    inputSchema: DataMigrationInputSchema,
    outputSchema: DataMigrationOutputSchema,
  },
  async (input) => {
    console.log("Data migration flow started.");
    console.log(`Received ${input.clients.length} clients to migrate.`);
    console.log(`Received ${input.plans.length} plans to migrate.`);
    console.log(`Received ${input.invoices.length} invoices to migrate.`);
    console.log(`Received ${input.expenses.length} expenses to migrate.`);
    console.log(`Received ${input.expenseCategories.length} categories to migrate.`);

    // In a real scenario, this is where you would:
    // 1. Connect to the MySQL database.
    // 2. Begin a transaction.
    // 3. Insert/update clients, plans, invoices, etc.
    // 4. Handle potential conflicts (e.g., if a record already exists).
    // 5. Commit the transaction if all operations are successful.
    // 6. Rollback the transaction if any operation fails.

    console.log("Data received by the backend. Database insertion logic to be implemented here.");

    // Simulate a successful migration for now.
    return {
      success: true,
      message: 'Dados recebidos no servidor. A lógica de inserção no banco de dados será implementada futuramente.',
      clientsMigrated: input.clients.length,
      plansMigrated: input.plans.length,
      invoicesMigrated: input.invoices.length,
      expensesMigrated: input.expenses.length,
      categoriesMigrated: input.expenseCategories.length,
    };
  }
);
