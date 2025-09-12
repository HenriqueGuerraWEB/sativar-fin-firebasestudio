
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { addPlan as addPlanFlow, getPlans as getPlansFlow, updatePlan as updatePlanFlow, deletePlan as deletePlanFlow } from '@/ai/flows/plans-flow';
import type { Plan, AddPlanInput } from '@/lib/types/plan-types';

export type { Plan } from '@/lib/types/plan-types';


export function usePlans() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadPlans = useCallback(async () => {
        if (!user) {
            setPlans([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const plansFromApi = await getPlansFlow();
            setPlans(plansFromApi.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Failed to load plans:", error);
            toast({
                title: 'Erro ao Carregar Planos',
                description: 'Não foi possível buscar os dados dos planos.',
                variant: 'destructive',
            });
            setPlans([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadPlans();
        }
    }, [user, authLoading, loadPlans]);

    const addPlan = async (planData: AddPlanInput) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await addPlanFlow(planData);
            await loadPlans();
        } catch (error) {
            console.error("Error adding plan:", error);
            throw new Error("Failed to add plan");
        }
    };

    const updatePlan = async (planId: string, updates: Partial<Omit<Plan, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await updatePlanFlow({ planId, updates });
            await loadPlans();
        } catch (error) {
            console.error("Error updating plan:", error);
            throw new Error("Failed to update plan");
        }
    };

    const deletePlan = async (planId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await deletePlanFlow(planId);
            await loadPlans();
        } catch (error) {
            console.error("Error deleting plan:", error);
            throw new Error("Failed to delete plan");
        }
    };

    return { plans, isLoading, addPlan, updatePlan, deletePlan, refreshPlans: loadPlans };
}
