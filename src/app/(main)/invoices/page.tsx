
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
import { collection, onSnapshot, query, Timestamp, orderBy, addDoc, doc, updateDoc, getDocs, where, deleteDoc } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, addMonths, addYears, isBefore, startOfDay, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type Plan = {
    id: string;
    price: number;
    recurrenceValue: number;
    recurrencePeriod: 'dias' | 'meses' | 'anos';
}

type Client = {
    id: string;
    name: string;
    planId?: string;
    status: 'Ativo' | 'Inativo';
    planActivationDate?: Timestamp;
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
            
            const today = startOfDay(new Date());
            const updatePromises: Promise<void>[] = [];

            const updatedInvoices = invoicesData.map(invoice => {
                const dueDate = invoice.dueDate.toDate();
                if (invoice.status === 'Pendente' && isBefore(dueDate, today)) {
                    const invoiceRef = doc(db, "invoices", invoice.id);
                    updatePromises.push(updateDoc(invoiceRef, { status: 'Vencida' }));
                    return {...invoice, status: 'Vencida'};
                }
                return invoice;
            });
            
            Promise.all(updatePromises).then(() => {
                 setInvoices(updatedInvoices.sort((a, b) => b.issueDate.toMillis() - a.issueDate.toMillis()));
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
            // 1. Fetch all active clients that have a plan
            const clientsQuery = query(collection(db, "clients"), where("status", "==", "Ativo"));
            const clientsSnapshot = await getDocs(clientsQuery);
            const activeClients = clientsSnapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id } as Client))
                .filter(client => client.planId && client.planActivationDate);

            if (activeClients.length === 0) {
                toast({ title: "Nenhuma ação necessária", description: "Não há clientes ativos com planos para gerar faturas." });
                setIsGenerating(false);
                return;
            }

            // 2. Fetch all plans
            const plansSnapshot = await getDocs(query(collection(db, "plans")));
            const plansMap = plansSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = { ...doc.data(), id: doc.id } as Plan;
                return acc;
            }, {} as Record<string, Plan>);

            // 3. Fetch all invoices to check for existing ones
            const invoicesSnapshot = await getDocs(query(collection(db, "invoices")));
            const clientInvoicesMap = new Map<string, Invoice[]>();
            invoicesSnapshot.docs.forEach(doc => {
                const invoice = doc.data() as Invoice;
                if (!clientInvoicesMap.has(invoice.clientId)) {
                    clientInvoicesMap.set(invoice.clientId, []);
                }
                clientInvoicesMap.get(invoice.clientId)!.push(invoice);
            });
            
            let generatedCount = 0;
            const generationPromises: Promise<any>[] = [];
            const today = new Date();

            for (const client of activeClients) {
                if (!client.planId || !client.planActivationDate) continue;

                const plan = plansMap[client.planId];
                if (!plan) continue;

                const clientInvoices = clientInvoicesMap.get(client.id)?.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis()) || [];
                const lastInvoice = clientInvoices.length > 0 ? clientInvoices[0] : null;

                let lastDueDate = lastInvoice ? lastInvoice.dueDate.toDate() : client.planActivationDate.toDate();
                
                // If there's no last invoice, the first "last due date" is the activation date itself.
                // We should check if an invoice needs to be generated for this activation date.
                if (!lastInvoice) {
                    const clientHasInvoiceForActivationDate = clientInvoices.some(
                        inv => format(inv.dueDate.toDate(), 'yyyy-MM-dd') === format(lastDueDate, 'yyyy-MM-dd')
                    );
                    
                    if (!clientHasInvoiceForActivationDate && (isBefore(lastDueDate, today) || format(lastDueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))) {
                         const newInvoice = {
                            clientId: client.id,
                            clientName: client.name,
                            amount: plan.price,
                            issueDate: Timestamp.now(),
                            dueDate: Timestamp.fromDate(lastDueDate),
                            status: 'Pendente' as const,
                        };
                        generationPromises.push(addDoc(collection(db, "invoices"), newInvoice));
                        generatedCount++;
                    }
                }
                
                // Iteratively generate invoices until the client is up-to-date
                while (true) {
                    let nextDueDate: Date;
                    switch (plan.recurrencePeriod) {
                        case 'dias': nextDueDate = addDays(lastDueDate, plan.recurrenceValue); break;
                        case 'meses': nextDueDate = addMonths(lastDueDate, plan.recurrenceValue); break;
                        case 'anos': nextDueDate = addYears(lastDueDate, plan.recurrenceValue); break;
                        default: throw new Error("Invalid recurrence period");
                    }

                    if (isBefore(nextDueDate, today) || format(nextDueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
                        const newInvoice = {
                            clientId: client.id,
                            clientName: client.name,
                            amount: plan.price,
                            issueDate: Timestamp.now(),
                            dueDate: Timestamp.fromDate(nextDueDate),
                            status: 'Pendente' as const,
                        };
                        generationPromises.push(addDoc(collection(db, "invoices"), newInvoice));
                        generatedCount++;
                        lastDueDate = nextDueDate; // Update last due date for the next iteration
                    } else {
                        break; // Stop if the next due date is in the future
                    }
                }
            }


            if (generatedCount > 0) {
                await Promise.all(generationPromises);
                toast({ title: "Sucesso!", description: `${generatedCount} nova(s) fatura(s) foram geradas.` });
            } else {
                toast({ title: "Nenhuma ação necessária", description: "Todos os clientes estão com as faturas em dia." });
            }

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
    };

    const handleSendReminder = async (invoice: Invoice) => {
        const dueDate = format(invoice.dueDate.toDate(), 'dd/MM/yyyy', { locale: ptBR });
        const amount = invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const reminderText = `
Olá, ${invoice.clientName}!

Este é um lembrete amigável sobre sua fatura pendente.

Valor: ${amount}
Vencimento: ${dueDate}

Agradecemos a sua atenção.
        `.trim();

        try {
            await navigator.clipboard.writeText(reminderText);
            toast({
                title: 'Copiado!',
                description: 'A mensagem de lembrete foi copiada para a área de transferência.',
            });
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast({
                title: 'Erro',
                description: 'Não foi possível copiar o texto.',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        try {
            await deleteDoc(doc(db, "invoices", invoiceId));
            toast({ title: "Sucesso", description: "Fatura excluída com sucesso." });
        } catch (error) {
            console.error("Error deleting invoice: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir a fatura.",
                variant: "destructive",
            });
        }
    };


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
                    {isGenerating ? 'Gerando...' : 'Gerar Faturas Recorrentes'}
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
                                                    <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>Enviar Lembrete</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a fatura.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>Excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
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
