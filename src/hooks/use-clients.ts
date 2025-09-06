
"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, Timestamp, orderBy } from "firebase/firestore";

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

export function useClients() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }
        if (!user) {
            // Should be handled by layout, but as a safeguard:
            setClients([]);
            setIsLoading(false);
            return;
        }

        const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const clientsData: Client[] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));
            setClients(clientsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching clients: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os clientes.",
                variant: "destructive",
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, toast]);


    const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            await addDoc(collection(db, "clients"), {
                ...clientData,
                createdAt: Timestamp.now()
            });
        } catch (error) {
            console.error("Error adding client: ", error);
            throw new Error("Failed to add client");
        }
    };

    const updateClient = async (clientId: string, clientData: Partial<Omit<Client, 'id'>>) => {
         if (!user) throw new Error("User not authenticated");
        try {
            const clientRef = doc(db, "clients", clientId);
            await updateDoc(clientRef, clientData);
        } catch (error) {
            console.error("Error updating client: ", error);
            throw new Error("Failed to update client");
        }
    };

    const deleteClient = async (clientId: string) => {
         if (!user) throw new Error("User not authenticated");
        try {
            await deleteDoc(doc(db, "clients", clientId));
        } catch (error) {
            console.error("Error deleting client: ", error);
            throw new Error("Failed to delete client");
        }
    };

    return { clients, isLoading, addClient, updateClient, deleteClient };
}

    