
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

// Schema for a Plan
export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  type: z.enum(['recurring', 'one-time']),
  recurrenceValue: z.number().optional(),
  recurrencePeriod: z.enum(['dias', 'meses', 'anos']).optional(),
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


/**
 * In-memory store for simulation purposes.
 * In a real scenario, this would interact with a MySQL database.
 */
let plansStore: Plan[] = [
    { id: 'plan-1', name: 'Plano Básico', description: 'Acesso básico a todos os recursos.', price: 29.90, type: 'recurring', recurrenceValue: 1, recurrencePeriod: 'meses' },
    { id: 'plan-2', name: 'Plano Profissional', description: 'Acesso total e suporte prioritário.', price: 79.90, type: 'recurring', recurrenceValue: 1, recurrencePeriod: 'meses' },
    { id: 'plan-3', name: 'Configuração Inicial', description: 'Serviço de configuração e onboarding.', price: 250.00, type: 'one-time' }
];

// Flow to get all plans
export const getPlans = ai.defineFlow(
  {
    name: 'getPlans',
    outputSchema: z.array(PlanSchema),
  },
  async () => {
    console.log('[PLANS_FLOW] Fetching all plans...');
    // TODO: Replace with MySQL query: SELECT * FROM plans;
    return plansStore;
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
    console.log('[PLANS_FLOW] Adding new plan...');
    // TODO: Replace with MySQL query: INSERT INTO plans (...);
    const newPlan: Plan = {
      ...planData,
      id: `plan-${Math.floor(Math.random() * 10000)}`,
    };
    plansStore.push(newPlan);
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
    console.log(`[PLANS_FLOW] Updating plan ${planId}...`);
    // TODO: Replace with MySQL query: UPDATE plans SET ... WHERE id = ...;
    let updatedPlan: Plan | null = null;
    plansStore = plansStore.map(p => {
        if (p.id === planId) {
            updatedPlan = { ...p, ...updates };
            return updatedPlan;
        }
        return p;
    });
    return updatedPlan;
  }
);

// Flow to delete a plan
export const deletePlan = ai.defineFlow(
  {
    name: 'deletePlan',
    inputSchema: z.string(), // planId
  },
  async (planId) => {
    console.log(`[PLANS_FLOW] Deleting plan ${planId}...`);
    // TODO: Replace with MySQL query: DELETE FROM plans WHERE id = ...;
    const initialLength = plansStore.length;
    plansStore = plansStore.filter(p => p.id !== planId);
    if (plansStore.length < initialLength) {
        console.log(`Plan ${planId} deleted.`);
    } else {
         console.warn(`Plan ${planId} not found for deletion.`);
    }
  }
);
