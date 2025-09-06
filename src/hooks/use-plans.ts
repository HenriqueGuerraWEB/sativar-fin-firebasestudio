
"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, getDocs, DocumentData } from "firebase/firestore";
import { useAuth } from '@/hooks/use-auth';

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
    const { user, loading: authLoading } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }
        if (!user) {
            setIsLoading(false);
            return;
        }

        const q = query(collection(db, "plans"));

        const fetchInitialData = async () => {
            try {
                const querySnapshot = await getDocs(q);
                setPlans(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Plan)));
            } catch (error) {
                console.error("Error fetching initial plans: ", error);
                toast({ title: "Erro", description: "Não foi possível carregar os planos.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setPlans(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Plan)));
            if (isLoading) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching plans: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os planos em tempo real.",
                variant: "destructive",
            });
        });

        return () => unsubscribe();
    }, [authLoading, user, toast]);

    const addPlan = async (planData: Omit<Plan, 'id'>) => {
        if (!user) throw new Error("User not authenticated");
        return await addDoc(collection(db, "plans"), planData);
    };

    const updatePlan = async (planId: string, planData: Partial<Plan>) => {
        if (!user) throw new Error("User not authenticated");
        const planRef = doc(db, "plans", planId);
        const { id, ...data } = planData;
        return await updateDoc(planRef, data);
    };

    const deletePlan = async (planId: string) => {
        if (!user) throw new Error("User not authenticated");
        return await deleteDoc(doc(db, "plans", planId));
    };

    return { plans, isLoading, addPlan, updatePlan, deletePlan };
}
