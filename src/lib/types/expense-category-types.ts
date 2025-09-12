
import { z } from 'zod';

// Schema for an Expense Category
export const ExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;


// Input schema for adding a category (omits 'id')
export const AddExpenseCategoryInputSchema = ExpenseCategorySchema.omit({ id: true });
export type AddExpenseCategoryInput = z.infer<typeof AddExpenseCategoryInputSchema>;


// Input schema for updating a category
export const UpdateExpenseCategoryInputSchema = z.object({
    categoryId: z.string(),
    updates: ExpenseCategorySchema.omit({ id: true }).partial(),
});
export type UpdateExpenseCategoryInput = z.infer<typeof UpdateExpenseCategoryInputSchema>;
