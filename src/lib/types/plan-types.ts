
import { z } from 'zod';

// Schema for a Plan
export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  type: z.enum(['recurring', 'one-time']),
  recurrenceValue: z.number().nullable().optional(),
  recurrencePeriod: z.enum(['dias', 'meses', 'anos']).nullable().optional(),
});
export type Plan = z.infer<typeof PlanSchema>;

// Input schema for adding a plan (omits 'id')
export const AddPlanInputSchema = PlanSchema.omit({ id: true });
export type AddPlanInput = z.infer<typeof AddPlanInputSchema>;

// Input schema for updating a plan (makes all fields optional)
export const UpdatePlanInputSchema = z.object({
    planId: z.string(),
    updates: PlanSchema.omit({ id: true }).partial(),
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;
