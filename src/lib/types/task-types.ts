
import { z } from 'zod';

// Base schema for a Task to allow for recursion
const BaseTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  dueDate: z.string(), // ISO string
  status: z.enum(['Pendente', 'Em Progresso', 'Concluída']),
  userId: z.string().nullable().optional(),
  relatedClientId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

// Recursive schema for subtasks
type TaskType = z.infer<typeof BaseTaskSchema> & {
  subtasks: TaskType[];
};

export const TaskSchema: z.ZodType<TaskType> = BaseTaskSchema.extend({
  subtasks: z.lazy(() => TaskSchema.array()),
});

export type Task = z.infer<typeof TaskSchema>;


// Input schema for adding a task (omits 'id' and 'subtasks')
export const AddTaskInputSchema = BaseTaskSchema.omit({ id: true }).extend({
    subtasks: z.undefined(), // Ensure subtasks are not part of the input
});
export type AddTaskInput = z.infer<typeof AddTaskInputSchema>;


// Input schema for updating a task
export const UpdateTaskInputSchema = z.object({
    taskId: z.string(),
    updates: BaseTaskSchema.omit({ id: true }).partial(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
