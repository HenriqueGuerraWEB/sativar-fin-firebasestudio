
'use server';
/**
 * @fileOverview Genkit flows for managing invoices.
 * 
 * - getInvoices - Retrieves all invoices.
 * - addInvoice - Adds a new invoice.
 * - addInvoices - Adds multiple new invoices.
 * - updateInvoice - Updates an existing invoice.
 * - deleteInvoice - Deletes an invoice.
 * - deleteInvoices - Deletes multiple invoices.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { 
    InvoiceSchema,
    Invoice,
    AddInvoiceInput,
    AddInvoicesInputSchema,
    UpdateInvoiceInputSchema,
    DeleteInvoicesInputSchema,
    AddInvoiceInputSchema
} from '@/lib/types/invoice-types';
import { pool } from '@/lib/db';
import { format } from 'date-fns';

// Helper function to format dates for MySQL
const formatDateForMySQL = (date: string | Date | null | undefined): string | null => {
    if (!date) return null;
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
    } catch {
        return null;
    }
};


// Flow to get all invoices
export const getInvoices = ai.defineFlow(
  {
    name: 'getInvoices',
    outputSchema: z.array(InvoiceSchema),
  },
  async () => {
    console.log('[INVOICES_FLOW] Fetching all invoices from database...');
    const results: any[] = await executeQuery('SELECT * FROM invoices ORDER BY issue_date DESC');
    return results.map(inv => ({
        id: inv.id,
        clientId: inv.client_id,
        planId: inv.plan_id,
        clientName: inv.client_name,
        planName: inv.plan_name,
        amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount,
        issueDate: new Date(inv.issue_date).toISOString(),
        dueDate: new Date(inv.due_date).toISOString(),
        status: inv.status,
        paymentDate: inv.payment_date ? new Date(inv.payment_date).toISOString() : null,
        paymentMethod: inv.payment_method,
        paymentNotes: inv.payment_notes,
    })) as Invoice[];
  }
);

// Flow to add a new invoice
export const addInvoice = ai.defineFlow(
  {
    name: 'addInvoice',
    inputSchema: AddInvoiceInputSchema,
    outputSchema: InvoiceSchema,
  },
  async (invoiceData) => {
    console.log('[INVOICES_FLOW] Adding new invoice to database...');
    const newInvoice: Invoice = {
      ...invoiceData,
      id: randomUUID(),
      paymentDate: null,
      paymentMethod: null,
      paymentNotes: null,
    };
    
    await executeQuery(
      `INSERT INTO invoices (id, client_id, plan_id, client_name, plan_name, amount, issue_date, due_date, status, payment_date, payment_method, payment_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newInvoice.id, 
        newInvoice.clientId, 
        newInvoice.planId, 
        newInvoice.clientName, 
        newInvoice.planName, 
        newInvoice.amount, 
        formatDateForMySQL(newInvoice.issueDate), 
        formatDateForMySQL(newInvoice.dueDate), 
        newInvoice.status, 
        formatDateForMySQL(newInvoice.paymentDate), 
        newInvoice.paymentMethod, 
        newInvoice.paymentNotes
      ]
    );

    return newInvoice;
  }
);

// Flow to add multiple invoices
export const addInvoices = ai.defineFlow(
  {
    name: 'addInvoices',
    inputSchema: AddInvoicesInputSchema,
    outputSchema: z.array(InvoiceSchema),
  },
  async (invoicesData: AddInvoiceInput[]) => {
    console.log(`[INVOICES_FLOW] Adding ${invoicesData.length} new invoices to database...`);
    if (invoicesData.length === 0) return [];
    
    const newInvoices: Invoice[] = invoicesData.map(inv => ({
      ...inv,
      id: randomUUID(),
      paymentDate: null,
      paymentMethod: null,
      paymentNotes: null,
    }));

    const values = newInvoices.map(inv => [
        inv.id, 
        inv.clientId, 
        inv.planId, 
        inv.clientName, 
        inv.planName, 
        inv.amount, 
        formatDateForMySQL(inv.issueDate), 
        formatDateForMySQL(inv.dueDate), 
        inv.status, 
        formatDateForMySQL(inv.paymentDate), 
        inv.paymentMethod, 
        inv.paymentNotes
    ]);
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            `INSERT INTO invoices (id, client_id, plan_id, client_name, plan_name, amount, issue_date, due_date, status, payment_date, payment_method, payment_notes) VALUES ?`,
            [values]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error("Error in addInvoices transaction, rolling back.", error);
        throw new Error("Failed to add invoices in a transaction.");
    } finally {
        connection.release();
    }
    
    return newInvoices;
  }
);


// Flow to update an existing invoice
export const updateInvoice = ai.defineFlow(
  {
    name: 'updateInvoice',
    inputSchema: UpdateInvoiceInputSchema,
    outputSchema: InvoiceSchema.nullable(),
  },
  async ({ invoiceId, updates }) => {
    console.log(`[INVOICES_FLOW] Updating invoice ${invoiceId} in database...`);
    
    if (Object.keys(updates).length === 0) {
        const result: any[] = await executeQuery('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
        if (result.length > 0) {
            const inv = result[0];
            return {
                id: inv.id,
                clientId: inv.client_id,
                planId: inv.plan_id,
                clientName: inv.client_name,
                planName: inv.plan_name,
                amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount,
                issueDate: new Date(inv.issue_date).toISOString(),
                dueDate: new Date(inv.due_date).toISOString(),
                status: inv.status,
                paymentDate: inv.payment_date ? new Date(inv.payment_date).toISOString() : null,
                paymentMethod: inv.payment_method,
                paymentNotes: inv.payment_notes,
            } as Invoice;
        }
        return null;
    }

    const dbUpdates: { [key: string]: any } = {};
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (key === 'issueDate' || key === 'dueDate' || key === 'paymentDate') {
                (dbUpdates as any)[dbKey] = formatDateForMySQL((updates as any)[key]);
            } else {
                (dbUpdates as any)[dbKey] = (updates as any)[key];
            }
        }
    }

    const fields = Object.keys(dbUpdates);
    const values = Object.values(dbUpdates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE invoices SET ${setClause} WHERE id = ?`, [...values, invoiceId]);
    
    const result: any[] = await executeQuery('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (result.length > 0) {
            const inv = result[0];
            return {
                id: inv.id,
                clientId: inv.client_id,
                planId: inv.plan_id,
                clientName: inv.client_name,
                planName: inv.plan_name,
                amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount,
                issueDate: new Date(inv.issue_date).toISOString(),
                dueDate: new Date(inv.due_date).toISOString(),
                status: inv.status,
                paymentDate: inv.payment_date ? new Date(inv.payment_date).toISOString() : null,
                paymentMethod: inv.payment_method,
                paymentNotes: inv.payment_notes,
            } as Invoice;
        }
    return null;
  }
);

// Flow to delete an invoice
export const deleteInvoice = ai.defineFlow(
  {
    name: 'deleteInvoice',
    inputSchema: z.string(), // invoiceId
    outputSchema: z.void(),
  },
  async (invoiceId) => {
    console.log(`[INVOICES_FLOW] Deleting invoice ${invoiceId} from database...`);
    await executeQuery('DELETE FROM invoices WHERE id = ?', [invoiceId]);
    console.log(`Invoice ${invoiceId} deleted.`);
  }
);


// Flow to delete multiple invoices
export const deleteInvoices = ai.defineFlow(
  {
    name: 'deleteInvoices',
    inputSchema: DeleteInvoicesInputSchema,
    outputSchema: z.void(),
  },
  async ({ invoiceIds }) => {
    if (invoiceIds.length === 0) {
      return;
    }
    console.log(`[INVOICES_FLOW] Deleting ${invoiceIds.length} invoices from database...`);

    const connection = await pool.getConnection();
    try {
        const placeholders = invoiceIds.map(() => '?').join(',');
        await connection.execute(`DELETE FROM invoices WHERE id IN (${placeholders})`, invoiceIds);
        console.log(`${invoiceIds.length} invoices deleted.`);
    } finally {
        connection.release();
    }
  }
);
