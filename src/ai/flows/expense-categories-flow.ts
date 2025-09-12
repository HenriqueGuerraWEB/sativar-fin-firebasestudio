
'use server';
/**
 * @fileOverview Genkit flows for managing expense categories.
 * 
 * - getExpenseCategories - Retrieves all expense categories.
 * - addExpenseCategory - Adds a new expense category.
 * - updateExpenseCategory - Updates an existing expense category.
 * - deleteExpenseCategory - Deletes an expense category.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { 
    ExpenseCategorySchema,
    ExpenseCategory,
    AddExpenseCategoryInputSchema,
    UpdateExpenseCategoryInputSchema
} from '@/lib/types/expense-category-types';


// Flow to get all expense categories
export const getExpenseCategories = ai.defineFlow(
  {
    name: 'getExpenseCategories',
    outputSchema: z.array(ExpenseCategorySchema),
  },
  async () => {
    console.log('[EXPENSE_CATEGORIES_FLOW] Fetching all expense categories from database...');
    const results = await executeQuery('SELECT * FROM expense_categories ORDER BY name ASC');
    return results as ExpenseCategory[];
  }
);

// Flow to add a new expense category
export const addExpenseCategory = ai.defineFlow(
  {
    name: 'addExpenseCategory',
    inputSchema: AddExpenseCategoryInputSchema,
    outputSchema: ExpenseCategorySchema,
  },
  async (categoryData) => {
    console.log('[EXPENSE_CATEGORIES_FLOW] Adding new category to database...');
    const newCategory: ExpenseCategory = {
      ...categoryData,
      id: randomUUID(),
    };
    
    await executeQuery(
      'INSERT INTO expense_categories (id, name) VALUES (?, ?)',
      [newCategory.id, newCategory.name]
    );

    return newCategory;
  }
);

// Flow to update an existing expense category
export const updateExpenseCategory = ai.defineFlow(
  {
    name: 'updateExpenseCategory',
    inputSchema: UpdateExpenseCategoryInputSchema,
    outputSchema: ExpenseCategorySchema.nullable(),
  },
  async ({ categoryId, updates }) => {
    console.log(`[EXPENSE_CATEGORIES_FLOW] Updating category ${categoryId} in database...`);
    
    if (Object.keys(updates).length === 0) {
        const result = await executeQuery('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
        return result.length > 0 ? (result as ExpenseCategory[])[0] : null;
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE expense_categories SET ${setClause} WHERE id = ?`, [...values, categoryId]);
    
    const result = await executeQuery('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
    return result.length > 0 ? (result as ExpenseCategory[])[0] : null;
  }
);

// Flow to delete an expense category
export const deleteExpenseCategory = ai.defineFlow(
  {
    name: 'deleteExpenseCategory',
    inputSchema: z.string(), // categoryId
    outputSchema: z.void(),
  },
  async (categoryId) => {
    console.log(`[EXPENSE_CATEGORIES_FLOW] Deleting category ${categoryId} from database...`);
    // Note: Expenses using this category will have their category_id set to NULL due to the foreign key constraint.
    await executeQuery('DELETE FROM expense_categories WHERE id = ?', [categoryId]);
    console.log(`Category ${categoryId} deleted.`);
  }
);
