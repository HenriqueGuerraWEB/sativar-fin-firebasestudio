
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { getExpenseCategories as getExpenseCategoriesFlow, addExpenseCategory as addExpenseCategoryFlow, updateExpenseCategory as updateExpenseCategoryFlow, deleteExpenseCategory as deleteExpenseCategoryFlow } from '@/ai/flows/expense-categories-flow';
import type { ExpenseCategory, AddExpenseCategoryInput, UpdateExpenseCategoryInput } from '@/lib/types/expense-category-types';

export type { ExpenseCategory, AddExpenseCategoryInput } from '@/lib/types/expense-category-types';


export function useExpenseCategories() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const loadCategories = useCallback(async () => {
        if (!user) {
            setCategories([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await getExpenseCategoriesFlow();
            setCategories(data);
        } catch (error) {
            console.error("Failed to load expense categories:", error);
            toast({
                title: 'Erro ao Carregar Categorias',
                description: 'Não foi possível buscar os dados das categorias.',
                variant: 'destructive',
            });
            setCategories([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadCategories();
        }
    }, [user, authLoading, loadCategories]);


    const addExpenseCategory = async (categoryData: AddExpenseCategoryInput): Promise<ExpenseCategory> => {
        if (!user) throw new Error("User not authenticated");
        const newCategory = await addExpenseCategoryFlow(categoryData);
        await loadCategories();
        return newCategory;
    };

    const updateExpenseCategory = async (categoryId: string, updates: Partial<Omit<ExpenseCategory, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        const input: UpdateExpenseCategoryInput = { categoryId, updates };
        await updateExpenseCategoryFlow(input);
        await loadCategories();
    };

    const deleteExpenseCategory = async (categoryId: string) => {
        if (!user) throw new Error("User not authenticated");
        await deleteExpenseCategoryFlow(categoryId);
        await loadCategories();
    };

    return { categories, isLoading, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, refreshCategories: loadCategories };
}
