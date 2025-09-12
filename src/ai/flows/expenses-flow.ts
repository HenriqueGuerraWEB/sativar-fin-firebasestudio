
'use server';
/**
 * @fileOverview Genkit flows for managing expenses.
 * 
 * - getExpenses - Retrieves all expenses.
 * - addExpense - Adds a new expense.
 * - updateExpense - Updates an existing expense.
 * - deleteExpense - Deletes an expense.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { 
    ExpenseSchema,
    Expense,
    AddExpenseInputSchema,
    UpdateExpenseInputSchema
} from '@/lib/types/expense-types';


// Flow to get all expenses
export const getExpenses = ai.defineFlow(
  {
    name: 'getExpenses',
    outputSchema: z.array(ExpenseSchema),
  },
  async () => {
    console.log('[EXPENSES_FLOW] Fetching all expenses from database...');
    const results: any[] = await executeQuery('SELECT * FROM expenses ORDER BY due_date DESC');
    return results.map(exp => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        dueDate: exp.due_date,
        status: exp.status,
        categoryId: exp.category_id,
    })) as Expense[];
  }
);

// Flow to add a new expense
export const addExpense = ai.defineFlow(
  {
    name: 'addExpense',
    inputSchema: AddExpenseInputSchema,
    outputSchema: ExpenseSchema,
  },
  async (expenseData) => {
    console.log('[EXPENSES_FLOW] Adding new expense to database...');
    const newExpense: Expense = {
      ...expenseData,
      id: randomUUID(),
    };
    
    await executeQuery(
      'INSERT INTO expenses (id, description, amount, due_date, status, category_id) VALUES (?, ?, ?, ?, ?, ?)',
      [newExpense.id, newExpense.description, newExpense.amount, newExpense.dueDate, newExpense.status, newExpense.categoryId]
    );

    return newExpense;
  }
);

// Flow to update an existing expense
export const updateExpense = ai.defineFlow(
  {
    name: 'updateExpense',
    inputSchema: UpdateExpenseInputSchema,
    outputSchema: ExpenseSchema.nullable(),
  },
  async ({ expenseId, updates }) => {
    console.log(`[EXPENSES_FLOW] Updating expense ${expenseId} in database...`);
    
    if (Object.keys(updates).length === 0) {
        const result: any[] = await executeQuery('SELECT * FROM expenses WHERE id = ?', [expenseId]);
        if (result.length > 0) {
            const exp = result[0];
            return {
                id: exp.id,
                description: exp.description,
                amount: exp.amount,
                dueDate: exp.due_date,
                status: exp.status,
                categoryId: exp.category_id,
            } as Expense;
        }
        return null;
    }

    const dbUpdates: { [key: string]: any } = {};
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            (dbUpdates as any)[dbKey] = (updates as any)[key];
        }
    }

    const fields = Object.keys(dbUpdates);
    const values = Object.values(dbUpdates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE expenses SET ${setClause} WHERE id = ?`, [...values, expenseId]);
    
    const result: any[] = await executeQuery('SELECT * FROM expenses WHERE id = ?', [expenseId]);
    if (result.length > 0) {
        const exp = result[0];
        return {
            id: exp.id,
            description: exp.description,
            amount: exp.amount,
            dueDate: exp.due_date,
            status: exp.status,
            categoryId: exp.category_id,
        } as Expense;
    }
    return null;
  }
);

// Flow to delete an expense
export const deleteExpense = ai.defineFlow(
  {
    name: 'deleteExpense',
    inputSchema: z.string(), // expenseId
    outputSchema: z.void(),
  },
  async (expenseId) => {
    console.log(`[EXPENSES_FLOW] Deleting expense ${expenseId} from database...`);
    await executeQuery('DELETE FROM expenses WHERE id = ?', [expenseId]);
    console.log(`Expense ${expenseId} deleted.`);
  }
);

    