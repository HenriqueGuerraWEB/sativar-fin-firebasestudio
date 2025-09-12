
import { z } from 'zod';

// Schema for an Expense
export const ExpenseSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  // Dates from the database may be strings, so we coerce them.
  dueDate: z.coerce.date(),
  status: z.enum(['Paga', 'Pendente']),
  categoryId: z.string().nullable().optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;


// Input schema for adding an expense (omits 'id')
export const AddExpenseInputSchema = ExpenseSchema.omit({ id: true });
export type AddExpenseInput = z.infer<typeof AddExpenseInputSchema>;


// Input schema for updating an expense
export const UpdateExpenseInputSchema = z.object({
    expenseId: z.string(),
    updates: ExpenseSchema.omit({ id: true }).partial(),
});
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseInputSchema>;
