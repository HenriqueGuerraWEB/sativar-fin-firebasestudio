
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { AddClientInput, Client } from '@/lib/types/client-types';
import { getClients as getClientsFlow, addClient as addClientFlow, updateClient as updateClientFlow, deleteClient as deleteClientFlow } from '@/ai/flows/clients-flow';


export type { Client, ClientPlan } from '@/lib/types/client-types';

export function useClients() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const loadClients = useCallback(async () => {
        if (!user) {
            setClients([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const clientsFromService = await getClientsFlow();
            setClients(clientsFromService);
        } catch (error) {
            console.error("Failed to load clients:", error);
            toast({
                title: 'Erro ao Carregar Clientes',
                description: 'Não foi possível buscar os dados dos clientes.',
                variant: 'destructive',
            });
            setClients([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadClients();
        }
    }, [user, authLoading, loadClients]);

    const addClient = async (clientData: AddClientInput) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const newClient = await addClientFlow(clientData);
            await loadClients();
            return newClient;
        } catch (error) {
            console.error("Error adding client:", error);
            throw new Error("Failed to add client");
        }
    };

    const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'createdAt'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const updatedClient = await updateClientFlow(clientId, clientData);
            await loadClients();
            return updatedClient;
        } catch (error) {
            console.error("Error updating client:", error);
            throw new Error("Failed to update client");
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await deleteClientFlow(clientId);
            await loadClients();
        } catch (error) {
            console.error("Error deleting client:", error);
            throw new Error("Failed to delete client");
        }
    };

    return { clients, isLoading, addClient, updateClient, deleteClient, refreshClients: loadClients };
}
