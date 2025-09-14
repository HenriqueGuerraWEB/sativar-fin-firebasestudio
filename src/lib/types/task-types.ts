
import { z } from 'zod';

// Schema for a Task
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  dueDate: z.string(), // ISO string
  status: z.enum(['Pendente', 'Em Progresso', 'Concluída']),
  userId: z.string().nullable().optional(),
  relatedClientId: z.string().nullable().optional(),
});
export type Task = z.infer<typeof TaskSchema>;


// Input schema for adding a task (omits 'id')
export const AddTaskInputSchema = TaskSchema.omit({ id: true });
export type AddTaskInput = z.infer<typeof AddTaskInputSchema>;


// Input schema for updating a task
export const UpdateTaskInputSchema = z.object({
    taskId: z.string(),
    updates: TaskSchema.omit({ id: true }).partial(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
