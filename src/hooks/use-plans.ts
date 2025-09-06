
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

    const getPlansFromStorage = useCallback((): Plan[] => {
        return StorageService.getCollection<Plan>('plans');
    }, []);
    
    useEffect(() => {
        setPlans(getPlansFromStorage());
        setIsLoading(false);
    }, [getPlansFromStorage]);

    const addPlan = async (planData: Omit<Plan, 'id'>) => {
        try {
            const newPlan = StorageService.addItem<Plan>('plans', planData);
            setPlans(prev => [...prev, newPlan]);
        } catch (error) {
            console.error("Error adding plan to localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível adicionar o plano.", variant: "destructive"});
            throw new Error("Failed to add plan");
        }
    };

    const updatePlan = async (planId: string, planData: Partial<Omit<Plan, 'id'>>) => {
        try {
            const updatedPlan = StorageService.updateItem<Plan>('plans', planId, planData);
            if (updatedPlan) {
                setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
            }
        } catch (error) {
            console.error("Error updating plan in localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar o plano.", variant: "destructive"});
            throw new Error("Failed to update plan");
        }
    };

    const deletePlan = async (planId: string) => {
        try {
            StorageService.deleteItem('plans', planId);
            setPlans(prev => prev.filter(p => p.id !== planId));
        } catch (error) {
            console.error("Error deleting plan from localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível excluir o plano.", variant: "destructive"});
            throw new Error("Failed to delete plan");
        }
    };

    return { plans, isLoading, addPlan, updatePlan, deletePlan };
}
