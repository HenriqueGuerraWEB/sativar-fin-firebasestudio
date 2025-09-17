
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = UserSchema.omit({ id: true });
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const UpdateUserInputSchema = z.object({
    userId: z.string(),
    updates: UserSchema.omit({ id: true }).partial(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
