
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type Plan = {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'recurring' | 'one-time';
    recurrenceValue?: number;
    recurrencePeriod?: 'dias' | 'meses' | 'anos';
};

const PLANS_STORAGE_KEY = 'sativar-plans';

export function usePlans() {
    const { toast } = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getPlansFromStorage = useCallback((): Plan[] => {
        if (typeof window === 'undefined') {
            return [];
        }
        try {
            const storedPlans = localStorage.getItem(PLANS_STORAGE_KEY);
            return storedPlans ? JSON.parse(storedPlans) : [];
        } catch (error) {
            console.error("Error reading plans from localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível ler os planos do armazenamento local.", variant: "destructive" });
            return [];
        }
    }, [toast]);
    
    useEffect(() => {
        setPlans(getPlansFromStorage());
        setIsLoading(false);
    }, [getPlansFromStorage]);

    const addPlan = async (planData: Omit<Plan, 'id'>) => {
        try {
            const currentPlans = getPlansFromStorage();
            const newPlan: Plan = {
                ...planData,
                id: crypto.randomUUID(),
            };
            const updatedPlans = [...currentPlans, newPlan];
            localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
            setPlans(updatedPlans);
        } catch (error) {
            console.error("Error adding plan to localStorage:", error);
            throw new Error("Failed to add plan");
        }
    };

    const updatePlan = async (planId: string, planData: Partial<Omit<Plan, 'id'>>) => {
        try {
            const currentPlans = getPlansFromStorage();
            const updatedPlans = currentPlans.map(plan => 
                plan.id === planId ? { ...plan, ...planData } : plan
            );
            localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
            setPlans(updatedPlans);
        } catch (error) {
            console.error("Error updating plan in localStorage:", error);
            throw new Error("Failed to update plan");
        }
    };

    const deletePlan = async (planId: string) => {
        try {
            const currentPlans = getPlansFromStorage();
            const updatedPlans = currentPlans.filter(plan => plan.id !== planId);
            localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
            setPlans(updatedPlans);
        } catch (error) {
            console.error("Error deleting plan from localStorage:", error);
            throw new Error("Failed to delete plan");
        }
    };

    return { plans, isLoading, addPlan, updatePlan, deletePlan };
}
