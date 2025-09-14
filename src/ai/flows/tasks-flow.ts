
'use server';
/**
 * @fileOverview Genkit flows for managing tasks.
 * 
 * - getTasks - Retrieves all tasks.
 * - addTask - Adds a new task.
 * - updateTask - Updates an existing task.
 * - deleteTask - Deletes a task.
 * - getNotificationTasks - Retrieves tasks that are overdue or due today.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { 
    TaskSchema,
    Task,
    AddTaskInputSchema,
    UpdateTaskInputSchema,
} from '@/lib/types/task-types';
import { format } from 'date-fns';
import { RowDataPacket } from 'mysql2';

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

// Flow to get all tasks
export const getTasks = ai.defineFlow(
  {
    name: 'getTasks',
    outputSchema: z.array(TaskSchema),
  },
  async () => {
    console.log('[TASKS_FLOW] Fetching all tasks from database...');
    const results = await executeQuery('SELECT * FROM tasks ORDER BY due_date ASC') as RowDataPacket[];
    return results.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: new Date(task.due_date).toISOString(),
        status: task.status,
        userId: task.user_id,
        relatedClientId: task.related_client_id,
    })) as Task[];
  }
);

// Flow to add a new task
export const addTask = ai.defineFlow(
  {
    name: 'addTask',
    inputSchema: AddTaskInputSchema,
    outputSchema: TaskSchema,
  },
  async (taskData) => {
    console.log('[TASKS_FLOW] Adding new task to database...');
    const newTask: Task = {
      ...taskData,
      id: randomUUID(),
    };
    
    await executeQuery(
      'INSERT INTO tasks (id, title, description, due_date, status, user_id, related_client_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
          newTask.id, 
          newTask.title, 
          newTask.description, 
          formatDateForMySQL(newTask.dueDate), 
          newTask.status, 
          newTask.userId, 
          newTask.relatedClientId
      ]
    );

    return newTask;
  }
);

// Flow to update an existing task
export const updateTask = ai.defineFlow(
  {
    name: 'updateTask',
    inputSchema: UpdateTaskInputSchema,
    outputSchema: TaskSchema.nullable(),
  },
  async ({ taskId, updates }) => {
    console.log(`[TASKS_FLOW] Updating task ${taskId} in database...`);
    
    const dbUpdates: { [key: string]: any } = {};
    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (key === 'dueDate') {
                (dbUpdates as any)[dbKey] = formatDateForMySQL((updates as any)[key]);
            } else {
                (dbUpdates as any)[dbKey] = (updates as any)[key];
            }
        }
    }

    if (Object.keys(dbUpdates).length === 0) {
        const result = await executeQuery('SELECT * FROM tasks WHERE id = ?', [taskId]) as RowDataPacket[];
        return result.length > 0 ? result[0] as Task : null;
    }
    
    const fields = Object.keys(dbUpdates);
    const values = Object.values(dbUpdates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...values, taskId]);
    
    const result: any[] = await executeQuery('SELECT * FROM tasks WHERE id = ?', [taskId]);
     if (result.length > 0) {
        const task = result[0];
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: new Date(task.due_date).toISOString(),
            status: task.status,
            userId: task.user_id,
            relatedClientId: task.related_client_id,
        } as Task;
    }
    return null;
  }
);

// Flow to delete a task
export const deleteTask = ai.defineFlow(
  {
    name: 'deleteTask',
    inputSchema: z.string(), // taskId
    outputSchema: z.void(),
  },
  async (taskId) => {
    console.log(`[TASKS_FLOW] Deleting task ${taskId} from database...`);
    await executeQuery('DELETE FROM tasks WHERE id = ?', [taskId]);
    console.log(`Task ${taskId} deleted.`);
  }
);

// Flow to get tasks for notification (overdue or due today)
export const getNotificationTasks = ai.defineFlow(
  {
    name: 'getNotificationTasks',
    outputSchema: z.array(TaskSchema),
  },
  async () => {
    console.log('[TASKS_FLOW] Fetching notification tasks...');
    const today = format(new Date(), 'yyyy-MM-dd');
    const query = `
        SELECT * FROM tasks 
        WHERE status != 'Concluída' AND DATE(due_date) <= ?
        ORDER BY due_date ASC
    `;
    const results = await executeQuery(query, [today]) as RowDataPacket[];
    return results.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: new Date(task.due_date).toISOString(),
        status: task.status,
        userId: task.user_id,
        relatedClientId: task.related_client_id,
    })) as Task[];
  }
);
