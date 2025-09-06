
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Timestamp } from "firebase/firestore";

export type ClientPlan = {
    planId: string;
    planActivationDate: Timestamp;
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
    createdAt: Timestamp;
};

// Helper to handle Timestamp serialization in JSON
const replacer = (key: any, value: any) => {
    if (value instanceof Timestamp) {
        return { __type: 'Timestamp', value: { seconds: value.seconds, nanoseconds: value.nanoseconds } };
    }
    return value;
};

const reviver = (key: any, value: any) => {
    if (value && value.__type === 'Timestamp') {
        return new Timestamp(value.value.seconds, value.value.nanoseconds);
    }
    return value;
};


const CLIENTS_STORAGE_KEY = 'sativar-clients';

export function useClients() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getClientsFromStorage = useCallback((): Client[] => {
        if (typeof window === 'undefined') {
            return [];
        }
        try {
            const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
            if (storedClients) {
                return JSON.parse(storedClients, reviver);
            }
            return [];
        } catch (error) {
            console.error("Error reading clients from localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível ler os clientes do armazenamento local.", variant: "destructive" });
            return [];
        }
    }, [toast]);
    
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
        
        setClients(getClientsFromStorage().sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
        setIsLoading(false);

    }, [user, authLoading, getClientsFromStorage]);


    const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const currentClients = getClientsFromStorage();
            const newClient: Client = {
                ...clientData,
                id: crypto.randomUUID(),
                createdAt: Timestamp.now()
            };
            const updatedClients = [...currentClients, newClient];
            localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updatedClients, replacer));
            setClients(updatedClients.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));

        } catch (error) {
            console.error("Error adding client to localStorage:", error);
            throw new Error("Failed to add client");
        }
    };

    const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const currentClients = getClientsFromStorage();
            const updatedClients = currentClients.map(client =>
                client.id === clientId ? { ...client, ...clientData } : client
            );
            localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updatedClients, replacer));
            setClients(updatedClients.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
        } catch (error)
        {
            console.error("Error updating client in localStorage:", error);
            throw new Error("Failed to update client");
        }
    };

    const deleteClient = async (clientId: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const currentClients = getClientsFromStorage();
            const updatedClients = currentClients.filter(client => client.id !== clientId);
            localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updatedClients, replacer));
            setClients(updatedClients.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
        } catch (error) {
            console.error("Error deleting client from localStorage:", error);
            throw new Error("Failed to delete client");
        }
    };

    return { clients, isLoading, addClient, updateClient, deleteClient };
}
