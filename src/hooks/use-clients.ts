
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

    const getClientsFromStorage = useCallback((): Client[] => {
        return StorageService.getCollection<Client>('clients');
    }, []);
    
    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }
        if (!user) {
            setClients([]);
            setIsLoading(false);
            return;
        }
        
        setClients(getClientsFromStorage().sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setIsLoading(false);

    }, [user, authLoading, getClientsFromStorage]);


    const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const newClientData = {
                ...clientData,
                createdAt: new Date()
            };
            const newClient = StorageService.addItem<Client>('clients', newClientData);
            setClients(prev => [...prev, newClient].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));

        } catch (error) {
            console.error("Error adding client to localStorage:", error);
            throw new Error("Failed to add client");
        }
    };

    const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const updatedClient = StorageService.updateItem<Client>('clients', clientId, clientData);
            if (updatedClient) {
                 setClients(prev => prev.map(client => client.id === clientId ? updatedClient : client).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
            }
        } catch (error)
        {
            console.error("Error updating client in localStorage:", error);
            throw new Error("Failed to update client");
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            StorageService.deleteItem('clients', clientId);
            setClients(prev => prev.filter(client => client.id !== clientId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
        } catch (error) {
            console.error("Error deleting client from localStorage:", error);
            throw new Error("Failed to delete client");
        }
    };

    return { clients, isLoading, addClient, updateClient, deleteClient };
}
