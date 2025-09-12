
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { StorageService } from '@/lib/storage-service';

export type ClientPlan = {
    planId: string;
    planActivationDate: Date;
};

export type Client = {
    id: string;
    name: string;
    taxId: string;
    contactName: string;
    email: string;
    phone: string;
    whatsapp: string;
    notes: string;
    status: "Ativo" | "Inativo";
    plans: ClientPlan[];
    createdAt: Date;
};

export function useClients() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const loadClients = async () => {
            if (authLoading) {
                setIsLoading(true);
                return;
            }
            if (!user) {
                setClients([]);
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            const clientsFromStorage = await StorageService.getCollection<Client>('clients');
            setClients(clientsFromStorage.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setIsLoading(false);
        };

        loadClients();
    }, [user, authLoading]);


    const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const newClientData = {
                ...clientData,
                createdAt: new Date()
            };
            const newClient = await StorageService.addItem<Client>('clients', newClientData);
            setClients(prev => [...prev, newClient].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        } catch (error) {
            console.error("Error adding client:", error);
            throw new Error("Failed to add client");
        }
    };

    const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const updatedClient = await StorageService.updateItem<Client>('clients', clientId, clientData);
            if (updatedClient) {
                 setClients(prev => prev.map(client => client.id === clientId ? updatedClient : client).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }
        } catch (error)
        {
            console.error("Error updating client:", error);
            throw new Error("Failed to update client");
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await StorageService.deleteItem('clients', clientId);
            setClients(prev => prev.filter(client => client.id !== clientId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Error deleting client:", error);
            throw new Error("Failed to delete client");
        }
    };

    return { clients, isLoading, addClient, updateClient, deleteClient };
}

    