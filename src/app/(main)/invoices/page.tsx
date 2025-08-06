
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Printer } from "lucide-react";
import type { VariantProps } from 'class-variance-authority';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, Timestamp, orderBy, addDoc, doc, updateDoc, getDocs, where, deleteDoc, getDoc } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, addMonths, addYears, isBefore, startOfDay, subDays, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type Plan = {
    id: string;
    name: string;
    description: string;
    price: number;
    recurrenceValue: number;
    recurrencePeriod: 'dias' | 'meses' | 'anos';
}

type Client = {
    id: string;
    name: string;
    email: string;
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
    planId: string;
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
                if (!invoice.dueDate) return invoice; // Skip if dueDate is missing
                const dueDate = invoice.dueDate.toDate();
                if (invoice.status === 'Pendente' && isBefore(dueDate, today)) {
                    const invoiceRef = doc(db, "invoices", invoice.id);
                    updatePromises.push(updateDoc(invoiceRef, { status: 'Vencida' }));
                    return {...invoice, status: 'Vencida'};
                }
                return invoice;
            });
            
            if (updatePromises.length > 0) {
                Promise.all(updatePromises).then(() => {
                     // The state will be updated by the new data from the snapshot listener automatically
                });
            }

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
                
                let lastBilledDueDate = clientInvoices.length > 0 
                    ? clientInvoices[0].dueDate.toDate()
                    : subDays(client.planActivationDate.toDate(), 1); // Start checking from day before activation
                
                // Loop to generate all missing invoices until the client is up-to-date
                while (true) {
                    let nextDueDate: Date;
                    // Ensure lastBilledDueDate is a valid date before calculation
                    if (!(lastBilledDueDate instanceof Date && !isNaN(lastBilledDueDate.valueOf()))) {
                       lastBilledDueDate = subDays(client.planActivationDate.toDate(), 1);
                    }

                    switch (plan.recurrencePeriod) {
                        case 'dias': nextDueDate = addDays(lastBilledDueDate, plan.recurrenceValue); break;
                        case 'meses': nextDueDate = addMonths(lastBilledDueDate, plan.recurrenceValue); break;
                        case 'anos': nextDueDate = addYears(lastBilledDueDate, plan.recurrenceValue); break;
                        default: console.error("Invalid recurrence period for plan:", plan.id); continue;
                    }

                    // Stop if the next due date is in the future
                    if (isBefore(today, nextDueDate)) {
                        break; 
                    }

                    // Check if an invoice for this exact due date already exists
                    const invoiceExists = clientInvoices.some(
                        inv => inv.dueDate && format(inv.dueDate.toDate(), 'yyyy-MM-dd') === format(nextDueDate, 'yyyy-MM-dd')
                    );

                    if (!invoiceExists) {
                        const newInvoice = {
                            clientId: client.id,
                            clientName: client.name,
                            amount: plan.price,
                            issueDate: Timestamp.now(),
                            dueDate: Timestamp.fromDate(nextDueDate),
                            status: 'Pendente' as const,
                            planId: client.planId,
                        };
                        generationPromises.push(addDoc(collection(db, "invoices"), newInvoice));
                        generatedCount++;
                    }

                    lastBilledDueDate = nextDueDate; // Update last due date for the next iteration
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
    
    const handlePrint = async (invoice: Invoice) => {
        try {
            if (!invoice.clientId || !invoice.planId) {
                toast({ title: 'Erro', description: 'Dados da fatura incompletos para impressão.', variant: 'destructive' });
                return;
            }

            const clientRef = doc(db, 'clients', invoice.clientId);
            const planRef = doc(db, 'plans', invoice.planId);

            const [clientDoc, planDoc] = await Promise.all([
                getDoc(clientRef),
                getDoc(planRef),
            ]);

            if (!clientDoc.exists() || !planDoc.exists()) {
                toast({ title: 'Erro', description: 'Não foi possível encontrar os dados do cliente ou do plano.', variant: 'destructive' });
                return;
            }

            const client = clientDoc.data() as Client;
            const plan = planDoc.data() as Plan;
            const dueDate = invoice.dueDate.toDate();
            let startDate: Date;

            switch (plan.recurrencePeriod) {
                case 'dias': startDate = subDays(dueDate, plan.recurrenceValue); break;
                case 'meses': startDate = subMonths(dueDate, plan.recurrenceValue); break;
                case 'anos': startDate = subYears(dueDate, plan.recurrenceValue); break;
                default: startDate = dueDate;
            }
            startDate = addDays(startDate, 1); // Start from the day after the last period ended

            const billingPeriod = `${format(startDate, 'dd/MM/yyyy')} - ${format(dueDate, 'dd/MM/yyyy')}`;

            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Fatura #${invoice.id.substring(0, 7).toUpperCase()}</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                                body { font-family: 'Inter', sans-serif; color: #111827; }
                                @media print {
                                    body { -webkit-print-color-adjust: exact; }
                                }
                                .status-Paga { background-color: #dcfce7; color: #166534; }
                                .status-Pendente { background-color: #fef9c3; color: #854d0e; }
                                .status-Vencida { background-color: #fee2e2; color: #991b1b; }
                            </style>
                        </head>
                        <body class="bg-gray-100 p-8">
                            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-12">
                                <div class="grid grid-cols-2 items-center mb-12">
                                    <div>
                                        <h1 class="text-3xl font-bold text-gray-800">Sativar</h1>
                                        <p class="text-gray-500">Rua Exemplo, 123<br>Cidade, Estado, 12345-678</p>
                                    </div>
                                    <div class="text-right">
                                        <h2 class="text-4xl font-bold text-gray-700">FATURA</h2>
                                        <p class="text-gray-500 mt-1">#${invoice.id.substring(0, 7).toUpperCase()}</p>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-8 mb-10">
                                    <div>
                                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Cobrança para</h3>
                                        <p class="font-bold text-lg text-gray-800">${invoice.clientName}</p>
                                        <p class="text-gray-600">${client.email}</p>
                                    </div>
                                    <div class="text-right">
                                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Detalhes da Fatura</h3>
                                        <p class="text-gray-600"><span class="font-medium">Data de Emissão:</span> ${format(invoice.issueDate.toDate(), 'dd/MM/yyyy')}</p>
                                        <p class="text-gray-600"><span class="font-medium">Data de Vencimento:</span> ${format(invoice.dueDate.toDate(), 'dd/MM/yyyy')}</p>
                                        <div class="mt-2">
                                            <span class="px-3 py-1 text-sm font-semibold rounded-full status-${invoice.status}">${invoice.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="overflow-x-auto rounded-lg border border-gray-200">
                                    <table class="w-full text-left">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="p-4 text-sm font-semibold text-gray-600">Descrição</th>
                                                <th class="p-4 text-sm font-semibold text-gray-600 text-center">Período de Serviço</th>
                                                <th class="p-4 text-sm font-semibold text-gray-600 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr class="border-b border-gray-200">
                                                <td class="p-4">
                                                    <p class="font-medium text-gray-800">${plan.name}</p>
                                                    <p class="text-sm text-gray-500">${plan.description}</p>
                                                </td>
                                                <td class="p-4 text-center text-gray-600">${billingPeriod}</td>
                                                <td class="p-4 text-right font-medium text-gray-800">${invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="grid grid-cols-2 mt-10">
                                    <div>
                                        <h4 class="font-semibold text-gray-800">Obrigado por sua preferência!</h4>
                                        <p class="text-sm text-gray-500">Sativar Inc.</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm text-gray-500 mb-1">Total</p>
                                        <p class="text-3xl font-bold text-gray-900">${invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </div>
                            </div>
                        </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                
                setTimeout(() => { // Timeout to ensure styles are loaded
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } catch (error) {
            console.error("Error preparing print data:", error);
            toast({ title: 'Erro', description: 'Não foi possível gerar o recibo para impressão.', variant: 'destructive' });
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
                                    <TableCell>{invoice.issueDate ? format(invoice.issueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{invoice.dueDate ? format(invoice.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(invoice.status)} className={getStatusClass(invoice.status)}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end items-center gap-2">
                                            {invoice.status === 'Paga' && (
                                                <Button aria-haspopup="true" size="icon" variant="ghost" onClick={() => handlePrint(invoice)}>
                                                    <Printer className="h-4 w-4" />
                                                    <span className="sr-only">Imprimir</span>
                                                </Button>
                                            )}
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
