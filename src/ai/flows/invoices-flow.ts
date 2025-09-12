
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
    AddInvoiceInputSchema,
    AddInvoicesInputSchema,
    UpdateInvoiceInputSchema,
    DeleteInvoicesInputSchema
} from '@/lib/types/invoice-types';
import { pool } from '@/lib/db';


// Flow to get all invoices
export const getInvoices = ai.defineFlow(
  {
    name: 'getInvoices',
    outputSchema: z.array(InvoiceSchema),
  },
  async () => {
    console.log('[INVOICES_FLOW] Fetching all invoices from database...');
    const results = await executeQuery('SELECT * FROM invoices ORDER BY issue_date DESC');
    return results as Invoice[];
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
    };
    
    await executeQuery(
      `INSERT INTO invoices (id, client_id, plan_id, client_name, plan_name, amount, issue_date, due_date, status, payment_date, payment_method, payment_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newInvoice.id, newInvoice.clientId, newInvoice.planId, newInvoice.clientName, newInvoice.planName, 
        newInvoice.amount, newInvoice.issueDate, newInvoice.dueDate, newInvoice.status, 
        newInvoice.paymentDate, newInvoice.paymentMethod, newInvoice.paymentNotes
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
  async (invoicesData) => {
    console.log(`[INVOICES_FLOW] Adding ${invoicesData.length} new invoices to database...`);
    if (invoicesData.length === 0) return [];
    
    const newInvoices: Invoice[] = invoicesData.map(inv => ({ ...inv, id: randomUUID() }));

    const values = newInvoices.map(inv => [
        inv.id, inv.clientId, inv.planId, inv.clientName, inv.planName, inv.amount, 
        inv.issueDate, inv.dueDate, inv.status
    ]);
    
    await executeQuery(
        `INSERT INTO invoices (id, client_id, plan_id, client_name, plan_name, amount, issue_date, due_date, status) VALUES ?`,
        [values]
    );

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
        const result = await executeQuery('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
        return result.length > 0 ? (result as Invoice[])[0] : null;
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE invoices SET ${setClause} WHERE id = ?`, [...values, invoiceId]);
    
    const result = await executeQuery('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    return result.length > 0 ? (result as Invoice[])[0] : null;
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
