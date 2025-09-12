
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { StorageService } from '@/lib/storage-service';
import type { AddClientInput, Client } from '@/lib/types/client-types';
import { addClient as addClientFlow, getClients as getClientsFlow } from '@/ai/flows/clients-flow';

const isDatabaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === 'true';

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
            const clientsFromStorage = isDatabaseEnabled 
                ? await getClientsFlow()
                : await StorageService.getCollection<Client>('clients');

            setClients(clientsFromStorage);
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
            let newClient;
            if (isDatabaseEnabled) {
                newClient = await addClientFlow(clientData);
            } else {
                newClient = await StorageService.addItem<Client>('clients', clientData);
            }
            await loadClients(); // Reload to reflect sorted list
            return newClient;
        } catch (error) {
            console.error("Error adding client:", error);
            throw new Error("Failed to add client");
        }
    };

    const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id' | 'createdAt'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const updatedClient = await StorageService.updateItem<Client>('clients', clientId, clientData);
            if (updatedClient) {
                 setClients(prev => prev.map(client => client.id === clientId ? updatedClient : client));
            }
            return updatedClient;
        }
        catch (error)
        {
            console.error("Error updating client:", error);
            throw new Error("Failed to update client");
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await StorageService.deleteItem('clients', clientId);
            setClients(prev => prev.filter(client => client.id !== clientId));
        } catch (error) {
            console.error("Error deleting client:", error);
            throw new Error("Failed to delete client");
        }
    };

    return { clients, isLoading, addClient, updateClient, deleteClient, refreshClients: loadClients };
}
