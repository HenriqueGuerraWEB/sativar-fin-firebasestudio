
'use server';
/**
 * @fileOverview Genkit flows for managing service plans.
 * 
 * - getPlans - Retrieves all service plans.
 * - addPlan - Adds a new service plan.
 * - updatePlan - Updates an existing service plan.
 * - deletePlan - Deletes a service plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';


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


// Flow to get all plans
export const getPlans = ai.defineFlow(
  {
    name: 'getPlans',
    outputSchema: z.array(PlanSchema),
  },
  async () => {
    console.log('[PLANS_FLOW] Fetching all plans from database...');
    const results = await executeQuery('SELECT * FROM plans');
    return results as Plan[];
  }
);

// Flow to add a new plan
export const addPlan = ai.defineFlow(
  {
    name: 'addPlan',
    inputSchema: AddPlanInputSchema,
    outputSchema: PlanSchema,
  },
  async (planData) => {
    console.log('[PLANS_FLOW] Adding new plan to database...');
    const newPlanId = randomUUID();
    const newPlan: Plan = {
      ...planData,
      id: newPlanId,
      recurrenceValue: planData.type === 'recurring' ? planData.recurrenceValue : null,
      recurrencePeriod: planData.type === 'recurring' ? planData.recurrencePeriod : null,
    };
    
    await executeQuery(
      'INSERT INTO plans (id, name, description, price, type, recurrenceValue, recurrencePeriod) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newPlan.id, newPlan.name, newPlan.description, newPlan.price, newPlan.type, newPlan.recurrenceValue, newPlan.recurrencePeriod]
    );

    return newPlan;
  }
);

// Flow to update an existing plan
export const updatePlan = ai.defineFlow(
  {
    name: 'updatePlan',
    inputSchema: UpdatePlanInputSchema,
    outputSchema: PlanSchema.nullable(),
  },
  async ({ planId, updates }) => {
    console.log(`[PLANS_FLOW] Updating plan ${planId} in database...`);
    
    if (Object.keys(updates).length === 0) {
        const result = await executeQuery('SELECT * FROM plans WHERE id = ?', [planId]);
        return result.length > 0 ? result[0] as Plan : null;
    }

    // Ensure recurrence fields are null if type is 'one-time'
    if (updates.type === 'one-time') {
      updates.recurrenceValue = null;
      updates.recurrencePeriod = null;
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await executeQuery(`UPDATE plans SET ${setClause} WHERE id = ?`, [...values, planId]);
    
    const result = await executeQuery('SELECT * FROM plans WHERE id = ?', [planId]);
    return result.length > 0 ? result[0] as Plan : null;
  }
);

// Flow to delete a plan
export const deletePlan = ai.defineFlow(
  {
    name: 'deletePlan',
    inputSchema: z.string(), // planId
  },
  async (planId) => {
    console.log(`[PLANS_FLOW] Deleting plan ${planId} from database...`);
    await executeQuery('DELETE FROM plans WHERE id = ?', [planId]);
    console.log(`Plan ${planId} deleted.`);
  }
);
