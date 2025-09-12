
import { z } from 'zod';

// Schema for an Invoice
export const InvoiceSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  planId: z.string(),
  clientName: z.string(),
  planName: z.string().nullable().optional(),
  amount: z.number(),
  // Dates from the database may be strings, so we coerce them.
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  status: z.enum(['Paga', 'Pendente', 'Vencida']),
  paymentDate: z.coerce.date().nullable().optional(),
  paymentMethod: z.enum(['Pix', 'Cartão de Crédito', 'Cartão de Débito']).nullable().optional(),
  paymentNotes: z.string().nullable().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;


// Input schema for adding an invoice (omits 'id')
export const AddInvoiceInputSchema = InvoiceSchema.omit({ id: true });
export type AddInvoiceInput = z.infer<typeof AddInvoiceInputSchema>;

// Input schema for adding multiple invoices
export const AddInvoicesInputSchema = z.array(AddInvoiceInputSchema);

// Input schema for updating an invoice
export const UpdateInvoiceInputSchema = z.object({
    invoiceId: z.string(),
    updates: InvoiceSchema.omit({ id: true }).partial(),
});
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;


// Input schema for deleting multiple invoices
export const DeleteInvoicesInputSchema = z.object({
    invoiceIds: z.array(z.string()),
});
