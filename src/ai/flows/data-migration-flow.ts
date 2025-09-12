
'use server';
/**
 * @fileOverview A flow for migrating user data from localStorage to the database.
 * 
 * - migrateData - A function that handles the data migration process.
 */

import { ai } from '@/ai/genkit';
import { DataMigrationInputSchema, DataMigrationOutputSchema, DataMigrationInput, DataMigrationOutput } from '@/lib/types/migration-types';
import { pool } from '@/lib/db';
import { format } from 'date-fns';

// Helper function to format dates for MySQL
const formatDateForMySQL = (date: Date | string | undefined | null): string | null => {
    if (!date) return null;
    // Ensure we have a Date object before formatting
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    try {
        return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
    } catch {
        return null; // Invalid date will throw, return null
    }
};


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
    
    if (!pool) {
      throw new Error("Database is not configured. Migration cannot proceed.");
    }
    
    const connection = await pool.getConnection();
    console.log("Database connection acquired.");

    try {
        await connection.beginTransaction();
        console.log("Transaction started.");

        // 1. Migrate Plans
        if (input.plans && input.plans.length > 0) {
            const planValues = input.plans.map(p => [
                p.id, p.name, p.description, p.price, p.type, p.recurrenceValue, p.recurrencePeriod
            ]);
            await connection.query(
                'INSERT INTO plans (id, name, description, price, type, recurrenceValue, recurrencePeriod) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price), type=VALUES(type), recurrenceValue=VALUES(recurrenceValue), recurrencePeriod=VALUES(recurrencePeriod)',
                [planValues]
            );
            console.log(`${input.plans.length} plans migrated.`);
        }

        // 2. Migrate Expense Categories
        if (input.expenseCategories && input.expenseCategories.length > 0) {
            const categoryValues = input.expenseCategories.map(c => [c.id, c.name]);
            await connection.query(
                'INSERT INTO expense_categories (id, name) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name)',
                [categoryValues]
            );
            console.log(`${input.expenseCategories.length} expense categories migrated.`);
        }

        // 3. Migrate Expenses
        if (input.expenses && input.expenses.length > 0) {
            const expenseValues = input.expenses.map(e => [
                e.id, e.description, e.amount, formatDateForMySQL(e.dueDate), e.status, e.category
            ]);
            await connection.query(
                'INSERT INTO expenses (id, description, amount, due_date, status, category_id) VALUES ? ON DUPLICATE KEY UPDATE description=VALUES(description), amount=VALUES(amount), due_date=VALUES(due_date), status=VALUES(status), category_id=VALUES(category_id)',
                [expenseValues]
            );
            console.log(`${input.expenses.length} expenses migrated.`);
        }

        // 4. Migrate Clients
        if (input.clients && input.clients.length > 0) {
            const clientValues = input.clients.map(c => [
                c.id, c.name, c.taxId, c.contactName, c.email, c.phone, c.whatsapp, c.notes, c.status, formatDateForMySQL(c.createdAt), JSON.stringify(c.plans || [])
            ]);
             await connection.query(
                'INSERT INTO clients (id, name, tax_id, contact_name, email, phone, whatsapp, notes, status, created_at, plans) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name), tax_id=VALUES(tax_id), contact_name=VALUES(contact_name), email=VALUES(email), phone=VALUES(phone), whatsapp=VALUES(whatsapp), notes=VALUES(notes), status=VALUES(status), created_at=VALUES(created_at), plans=VALUES(plans)',
                [clientValues]
            );
            console.log(`${input.clients.length} clients migrated.`);
        }
        
        // 5. Migrate Invoices
        if (input.invoices && input.invoices.length > 0) {
            const invoiceValues = input.invoices.map(i => [
                i.id, i.clientId, i.planId, i.clientName, i.planName, i.amount, formatDateForMySQL(i.issueDate), formatDateForMySQL(i.dueDate), i.status, formatDateForMySQL(i.paymentDate), i.paymentMethod, i.paymentNotes
            ]);
            await connection.query(
                'INSERT INTO invoices (id, client_id, plan_id, client_name, plan_name, amount, issue_date, due_date, status, payment_date, payment_method, payment_notes) VALUES ? ON DUPLICATE KEY UPDATE client_id=VALUES(client_id), plan_id=VALUES(plan_id), client_name=VALUES(client_name), plan_name=VALUES(plan_name), amount=VALUES(amount), issue_date=VALUES(issue_date), due_date=VALUES(due_date), status=VALUES(status), payment_date=VALUES(payment_date), payment_method=VALUES(payment_method), payment_notes=VALUES(payment_notes)',
                [invoiceValues]
            );
            console.log(`${input.invoices.length} invoices migrated.`);
        }

        // 6. Migrate Settings
        if (input.settings) {
            const s = input.settings;
            const settingsValues = [
                s.id, s.name, s.cpf, s.cnpj, s.address, s.phone, s.email, s.website, s.logoDataUrl
            ];
            await connection.query(
                `INSERT INTO company_settings (id, name, cpf, cnpj, address, phone, email, website, logo) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 name=VALUES(name), cpf=VALUES(cpf), cnpj=VALUES(cnpj), address=VALUES(address), phone=VALUES(phone), email=VALUES(email), website=VALUES(website), logo=VALUES(logo)`,
                 settingsValues
            );
            console.log('Company settings migrated.');
        }

        await connection.commit();
        console.log("Transaction committed successfully.");
        
        const message = (input.clients?.length || 0) === 0 &&
                        (input.plans?.length || 0) === 0 &&
                        (input.invoices?.length || 0) === 0 &&
                        (input.expenses?.length || 0) === 0 &&
                        (input.expenseCategories?.length || 0) === 0 &&
                        !input.settings
                        ? 'Nenhum dado local encontrado para migrar, mas a conexão com o banco de dados foi verificada.'
                        : 'Migração de dados concluída com sucesso! Todos os dados foram salvos no banco de dados.';


        return {
            success: true,
            message: message,
            clientsMigrated: input.clients?.length || 0,
            plansMigrated: input.plans?.length || 0,
            invoicesMigrated: input.invoices?.length || 0,
            expensesMigrated: input.expenses?.length || 0,
            categoriesMigrated: input.expenseCategories?.length || 0,
        };
    } catch (error: any) {
        await connection.rollback();
        console.error("Transaction rolled back due to an error:", error);
        throw new Error(`Falha na migração do banco de dados: ${error.message}`);
    } finally {
        connection.release();
        console.log("Database connection released.");
    }
  }
);

    