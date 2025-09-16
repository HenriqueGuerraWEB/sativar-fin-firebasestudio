
'use server';
/**
 * @fileOverview Genkit flows for generating user notifications.
 *
 * - getPlanRenewalAlerts: Finds clients with recurring plans that are due for renewal soon.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getClients } from './clients-flow';
import { getPlans } from './plans-flow';
import { getInvoices } from './invoices-flow';
import { startOfDay, addDays, isBefore } from 'date-fns';
import { Client } from '@/lib/types/client-types';
import { Plan } from '@/lib/types/plan-types';
import { Invoice } from '@/lib/types/invoice-types';


const PlanRenewalAlertSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  planId: z.string(),
  planName: z.string(),
  nextDueDate: z.string(),
});
export type PlanRenewalAlert = z.infer<typeof PlanRenewalAlertSchema>;


export const getPlanRenewalAlerts = ai.defineFlow(
  {
    name: 'getPlanRenewalAlerts',
    outputSchema: z.array(PlanRenewalAlertSchema),
  },
  async () => {
    console.log('[NOTIFICATIONS_FLOW] Checking for plan renewal alerts...');
    const alerts: PlanRenewalAlert[] = [];
    const today = startOfDay(new Date());
    const notificationEndDate = addDays(today, 5); // Alert for renewals in the next 5 days

    try {
      const [clients, plans, invoices] = await Promise.all([
        getClients(),
        getPlans(),
        getInvoices(),
      ]);

      const activeClients = clients.filter(c => c.status === 'Ativo');
      const plansMap = new Map(plans.map(p => [p.id, p]));
      const invoicesMap = new Map<string, Invoice[]>();
      invoices.forEach(inv => {
          const key = `${inv.clientId}-${inv.planId}`;
          if (!invoicesMap.has(key)) {
              invoicesMap.set(key, []);
          }
          invoicesMap.get(key)!.push(inv);
      });

      for (const client of activeClients) {
        if (!client.plans || client.plans.length === 0) continue;

        for (const clientPlan of client.plans) {
          const plan = plansMap.get(clientPlan.planId);
          if (!plan || plan.type !== 'recurring') continue;

          const clientPlanInvoices = invoicesMap.get(`${client.id}-${clientPlan.planId}`) || [];
          clientPlanInvoices.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

          const lastInvoice = clientPlanInvoices[0];
          let lastBilledDueDate = lastInvoice ? new Date(lastInvoice.dueDate) : new Date(clientPlan.planActivationDate);

          // If there are no invoices yet, the first due date is the activation date
          if (!lastInvoice) {
               if (isBefore(lastBilledDueDate, notificationEndDate)) {
                    alerts.push({
                        clientId: client.id,
                        clientName: client.name,
                        planId: plan.id,
                        planName: plan.name,
                        nextDueDate: lastBilledDueDate.toISOString(),
                    });
               }
               continue;
          }

          // Calculate next due date
          let nextDueDate: Date;
           switch (plan.recurrencePeriod) {
                case 'dias': nextDueDate = addDays(lastBilledDueDate, plan.recurrenceValue || 0); break;
                case 'meses': nextDueDate = addDays(lastBilledDueDate, (plan.recurrenceValue || 0) * 30); break; // Simplified for now
                case 'anos': nextDueDate = addDays(lastBilledDueDate, (plan.recurrenceValue || 0) * 365); break; // Simplified for now
                default: continue;
            }
            
            // Check if the next due date is within our notification window
            if (isBefore(nextDueDate, notificationEndDate) && isBefore(today, nextDueDate)) {
                 // Check if an invoice for this next due date already exists
                 const invoiceAlreadyExists = clientPlanInvoices.some(
                    inv => startOfDay(new Date(inv.dueDate)).getTime() === startOfDay(nextDueDate).getTime()
                );

                if (!invoiceAlreadyExists) {
                    alerts.push({
                        clientId: client.id,
                        clientName: client.name,
                        planId: plan.id,
                        planName: plan.name,
                        nextDueDate: nextDueDate.toISOString(),
                    });
                }
            }
        }
      }

      console.log(`[NOTIFICATIONS_FLOW] Found ${alerts.length} plan renewal alerts.`);
      return alerts;

    } catch (error) {
      console.error('[NOTIFICATIONS_FLOW] Error getting renewal alerts:', error);
      return []; // Return empty array on error
    }
  }
);
