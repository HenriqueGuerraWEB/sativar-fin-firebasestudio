
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { getExpenses as getExpensesFlow, addExpense as addExpenseFlow, updateExpense as updateExpenseFlow, deleteExpense as deleteExpenseFlow } from '@/ai/flows/expenses-flow';
import type { Expense, AddExpenseInput } from '@/lib/types/expense-types';

export type { Expense, AddExpenseInput } from '@/lib/types/expense-types';


export function useExpenses() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const loadExpenses = useCallback(async () => {
        if (!user) {
            setExpenses([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await getExpensesFlow();
            setExpenses(data);
        } catch (error) {
            console.error("Failed to load expenses:", error);
            toast({
                title: 'Erro ao Carregar Despesas',
                description: 'Não foi possível buscar os dados das despesas.',
                variant: 'destructive',
            });
            setExpenses([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadExpenses();
        }
    }, [user, authLoading, loadExpenses]);


    const addExpense = async (expenseData: AddExpenseInput) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await addExpenseFlow(expenseData);
            await loadExpenses();
        } catch (error) {
            console.error("Error adding expense:", error);
            throw new Error("Failed to add expense");
        }
    };

    const updateExpense = async (expenseId: string, updates: Partial<Omit<Expense, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await updateExpenseFlow({ expenseId, updates });
            await loadExpenses();
        }
        catch (error)
        {
            console.error("Error updating expense:", error);
            throw new Error("Failed to update expense");
        }
    };

    const deleteExpense = async (expenseId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await deleteExpenseFlow(expenseId);
            await loadExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            throw new Error("Failed to delete expense");
        }
    };

    return { expenses, isLoading, addExpense, updateExpense, deleteExpense, refreshExpenses: loadExpenses };
}
