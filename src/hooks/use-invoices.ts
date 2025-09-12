
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { getInvoices as getInvoicesFlow, addInvoices as addInvoicesFlow, updateInvoice as updateInvoiceFlow, deleteInvoice as deleteInvoiceFlow, deleteInvoices as deleteInvoicesFlow } from '@/ai/flows/invoices-flow';
import type { Invoice, AddInvoiceInput } from '@/lib/types/invoice-types';

export type { Invoice, AddInvoiceInput } from '@/lib/types/invoice-types';


export function useInvoices() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const loadInvoices = useCallback(async () => {
        if (!user) {
            setInvoices([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await getInvoicesFlow();
            setInvoices(data);
        } catch (error) {
            console.error("Failed to load invoices:", error);
            toast({
                title: 'Erro ao Carregar Faturas',
                description: 'Não foi possível buscar os dados das faturas.',
                variant: 'destructive',
            });
            setInvoices([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadInvoices();
        }
    }, [user, authLoading, loadInvoices]);


    const addInvoices = async (invoicesData: AddInvoiceInput[]) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await addInvoicesFlow(invoicesData);
            await loadInvoices();
        } catch (error) {
            console.error("Error adding invoices:", error);
            throw new Error("Failed to add invoices");
        }
    };

    const updateInvoice = async (invoiceId: string, updates: Partial<Omit<Invoice, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await updateInvoiceFlow({ invoiceId, updates });
            await loadInvoices();
        }
        catch (error)
        {
            console.error("Error updating invoice:", error);
            throw new Error("Failed to update invoice");
        }
    };

    const deleteInvoice = async (invoiceId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await deleteInvoiceFlow(invoiceId);
            await loadInvoices();
        } catch (error) {
            console.error("Error deleting invoice:", error);
            throw new Error("Failed to delete invoice");
        }
    };

    const deleteInvoices = async (invoiceIds: string[]) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await deleteInvoicesFlow({ invoiceIds });
            await loadInvoices();
        } catch (error) {
            console.error("Error deleting invoices:", error);
            throw new Error("Failed to delete invoices");
        }
    };

    return { invoices, isLoading, addInvoices, updateInvoice, deleteInvoice, deleteInvoices, refreshInvoices: loadInvoices };
}
