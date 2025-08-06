
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import type { VariantProps } from 'class-variance-authority';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Timestamp, orderBy, addDoc, doc, updateDoc, getDocs, where } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format, endOfMonth, startOfMonth } from 'date-fns';

type Plan = {
    id: string;
    price: number;
}

type Client = {
    id: string;
    name: string;
    planId?: string;
    status: 'Ativo' | 'Inativo';
}

type Invoice = {
    id: string;
    clientName: string;
    clientId: string;
    amount: number;
    issueDate: Timestamp;
    dueDate: Timestamp;
    status: 'Paga' | 'Pendente' | 'Vencida';
};

export default function InvoicesPage() {
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "invoices"), orderBy("issueDate", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const invoicesData: Invoice[] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
            
            const updatedInvoices = invoicesData.map(invoice => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const dueDate = invoice.dueDate.toDate();
                if (invoice.status === 'Pendente' && dueDate < today) {
                    const invoiceRef = doc(db, "invoices", invoice.id);
                    updateDoc(invoiceRef, { status: 'Vencida' });
                    return {...invoice, status: 'Vencida'};
                }
                return invoice;
            });
            
            setInvoices(updatedInvoices);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching invoices: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar as faturas.",
                variant: "destructive",
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const handleGenerateInvoices = async () => {
        setIsGenerating(true);
        try {
            // 1. Fetch all active clients with a plan
            const clientsQuery = query(collection(db, "clients"), where("status", "==", "Ativo"), where("planId", "!=", null));
            const clientsSnapshot = await getDocs(clientsQuery);
            const activeClients = clientsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));

            if (activeClients.length === 0) {
                toast({ title: "Nenhuma ação necessária", description: "Não há clientes ativos com planos para gerar faturas." });
                return;
            }

            // 2. Fetch all plans
            const plansQuery = query(collection(db, "plans"));
            const plansSnapshot = await getDocs(plansQuery);
            const plansMap = plansSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = { ...doc.data(), id: doc.id } as Plan;
                return acc;
            }, {} as Record<string, Plan>);

            // 3. Fetch invoices for the current month
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            const endOfCurrentMonth = endOfMonth(now);
            const invoicesQuery = query(collection(db, "invoices"), 
                where("issueDate", ">=", Timestamp.fromDate(startOfCurrentMonth)),
                where("issueDate", "<=", Timestamp.fromDate(endOfCurrentMonth))
            );
            const invoicesSnapshot = await getDocs(invoicesQuery);
            const existingInvoicesClientIds = new Set(invoicesSnapshot.docs.map(doc => doc.data().clientId));

            // 4. Determine which clients need invoices
            const clientsToInvoice = activeClients.filter(client => !existingInvoicesClientIds.has(client.id));

            if (clientsToInvoice.length === 0) {
                toast({ title: "Nenhuma ação necessária", description: "Todos os clientes ativos já possuem faturas para o mês corrente." });
                return;
            }

            // 5. Create new invoices
            const generationPromises = clientsToInvoice.map(client => {
                const plan = plansMap[client.planId!];
                if (!plan) {
                    console.warn(`Plano com ID ${client.planId} não encontrado para o cliente ${client.name}.`);
                    return Promise.resolve(null);
                }

                const newInvoice = {
                    clientId: client.id,
                    clientName: client.name,
                    amount: plan.price,
                    issueDate: Timestamp.now(),
                    dueDate: Timestamp.fromDate(endOfMonth(new Date())),
                    status: 'Pendente' as const,
                };
                return addDoc(collection(db, "invoices"), newInvoice);
            });

            await Promise.all(generationPromises);

            toast({ title: "Sucesso!", description: `${clientsToInvoice.length} novas faturas foram geradas com sucesso.` });

        } catch (error) {
            console.error("Error generating invoices:", error);
            toast({ title: "Erro", description: "Ocorreu um erro ao gerar as faturas.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    }


    const handleUpdateStatus = async (invoiceId: string, status: Invoice['status']) => {
        try {
            const invoiceRef = doc(db, "invoices", invoiceId);
            await updateDoc(invoiceRef, { status });
            toast({ title: "Sucesso", description: `Fatura marcada como ${status}.`});
        } catch (error) {
            console.error("Error updating status: ", error);
            toast({ title: "Erro", description: "Não foi possível atualizar o status da fatura.", variant: "destructive" });
        }
    }


    const getStatusVariant = (status: Invoice['status']): VariantProps<typeof badgeVariants>['variant'] => {
        switch (status) {
            case 'Paga': return 'secondary';
            case 'Pendente': return 'outline';
            case 'Vencida': return 'destructive';
            default: return 'default';
        }
    }

    const getStatusClass = (status: Invoice['status']) => {
        switch (status) {
            case 'Paga': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
            case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400';
            case 'Vencida': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400';
            default: return '';
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Faturas</h1>
                    <p className="text-muted-foreground">Gerencie e visualize todas as faturas.</p>
                </div>
                 <Button size="sm" className="gap-1" onClick={handleGenerateInvoices} disabled={isGenerating}>
                    <PlusCircle className="h-4 w-4" />
                    {isGenerating ? 'Gerando...' : 'Gerar Faturas Pendentes'}
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Faturas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fatura</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Emissão</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            )) : invoices.map(invoice => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">#{invoice.id.substring(0, 7).toUpperCase()}</TableCell>
                                    <TableCell>{invoice.clientName}</TableCell>
                                    <TableCell>{format(invoice.issueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{format(invoice.dueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(invoice.status)} className={getStatusClass(invoice.status)}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Paga')} disabled={invoice.status === 'Paga'}>Marcar como Paga</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Pendente')} disabled={invoice.status === 'Pendente'}>Marcar como Pendente</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                                    <DropdownMenuItem>Enviar Lembrete</DropdownMenuItem>
                                                    <DropdownMenuItem>Baixar PDF</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
