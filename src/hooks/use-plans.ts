
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StorageService } from '@/lib/storage-service';


export type Plan = {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'recurring' | 'one-time';
    recurrenceValue?: number;
    recurrencePeriod?: 'dias' | 'meses' | 'anos';
};

export function usePlans() {
    const { toast } = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPlans = async () => {
            setIsLoading(true);
            const plansFromStorage = await StorageService.getCollection<Plan>('plans');
            setPlans(plansFromStorage);
            setIsLoading(false);
        }
        loadPlans();
    }, []);

    const addPlan = async (planData: Omit<Plan, 'id'>) => {
        try {
            const newPlan = await StorageService.addItem<Plan>('plans', planData);
            setPlans(prev => [...prev, newPlan]);
        } catch (error) {
            console.error("Error adding plan:", error);
            toast({ title: "Erro", description: "Não foi possível adicionar o plano.", variant: "destructive"});
            throw new Error("Failed to add plan");
        }
    };

    const updatePlan = async (planId: string, planData: Partial<Omit<Plan, 'id'>>) => {
        try {
            const updatedPlan = await StorageService.updateItem<Plan>('plans', planId, planData);
            if (updatedPlan) {
                setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
            }
        } catch (error) {
            console.error("Error updating plan:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar o plano.", variant: "destructive"});
            throw new Error("Failed to update plan");
        }
    };

    const deletePlan = async (planId: string) => {
        try {
            await StorageService.deleteItem('plans', planId);
            setPlans(prev => prev.filter(p => p.id !== planId));
        } catch (error) {
            console.error("Error deleting plan:", error);
            toast({ title: "Erro", description: "Não foi possível excluir o plano.", variant: "destructive"});
            throw new Error("Failed to delete plan");
        }
    };

    return { plans, isLoading, addPlan, updatePlan, deletePlan };
}

    