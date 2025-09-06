
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Printer, Calendar as CalendarIcon, ChevronDown, Shapes, Trash2 } from "lucide-react";
import type { VariantProps } from 'class-variance-authority';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, addMonths, addYears, isBefore, startOfDay, subDays, subMonths, subYears, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { StorageService } from '@/lib/storage-service';


type Plan = {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'recurring' | 'one-time';
    recurrenceValue?: number;
    recurrencePeriod?: 'dias' | 'meses' | 'anos';
}

type ClientPlan = {
    planId: string;
    planActivationDate: Timestamp;
};

type Client = {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    plans: ClientPlan[];
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
    planId: string;
    planName?: string;
    paymentDate?: Timestamp;
    paymentMethod?: 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito';
    paymentNotes?: string;
};

type CompanySettings = {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logoDataUrl: string;
    cpf: string;
    cnpj: string;
};

type GroupedInvoices = {
    [clientId: string]: {
        clientName: string;
        invoices: Invoice[];
    };
};


export default function InvoicesPage() {
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderText, setReminderText] = useState("");
    const [clientForReminder, setClientForReminder] = useState<Client | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentDetails, setPaymentDetails] = useState<{
        paymentDate: Date | undefined;
        paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | undefined;
        paymentNotes: string;
    }>({
        paymentDate: new Date(),
        paymentMethod: undefined,
        paymentNotes: '',
    });
    
    const processInvoices = useCallback((invoicesData: Invoice[]) => {
        const today = startOfDay(new Date());
        let hasUpdates = false;

        const updatedInvoices = invoicesData.map(invoice => {
            if (!invoice.dueDate) return invoice;
            const dueDate = invoice.dueDate.toDate();
            if (invoice.status === 'Pendente' && isBefore(dueDate, today)) {
                hasUpdates = true;
                return {...invoice, status: 'Vencida' as const};
            }
            return invoice;
        });
        
        if (hasUpdates) {
           StorageService.setCollection('invoices', updatedInvoices);
        }

        return updatedInvoices.sort((a,b) => b.issueDate.toMillis() - a.issueDate.toMillis());
    }, []);
    
    useEffect(() => {
        setIsLoading(true);
        const storedInvoices = StorageService.getCollection<Invoice>('invoices');
        const processed = processInvoices(storedInvoices);
        setInvoices(processed);
        setIsLoading(false);

        const handleStorageChange = () => {
             const storedInvoices = StorageService.getCollection<Invoice>('invoices');
             const processed = processInvoices(storedInvoices);
             setInvoices(processed);
        }
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);

    }, [processInvoices]);
    
    const groupedInvoices = useMemo(() => {
        return invoices.reduce((acc, invoice) => {
            const { clientId, clientName } = invoice;
            if (!acc[clientId]) {
                acc[clientId] = {
                    clientName,
                    invoices: [],
                };
            }
            acc[clientId].invoices.push(invoice);
            acc[clientId].invoices.sort((a,b) => b.dueDate.toMillis() - a.dueDate.toMillis());
            return acc;
        }, {} as GroupedInvoices);
    }, [invoices]);

    const handleGenerateInvoices = async () => {
        setIsGenerating(true);
        try {
            const allClients: Client[] = StorageService.getCollection<Client>('clients');
            const activeClients = allClients.filter(client => client.status === "Ativo" && client.plans && client.plans.length > 0);

            if (activeClients.length === 0) {
                toast({ title: "Nenhuma ação necessária", description: "Não há clientes ativos com planos para gerar faturas." });
                setIsGenerating(false);
                return;
            }

            const allPlans: Plan[] = StorageService.getCollection<Plan>('plans');
            const plansMap = allPlans.reduce((acc, plan) => {
                acc[plan.id] = plan;
                return acc;
            }, {} as Record<string, Plan>);

            const allInvoices: Invoice[] = StorageService.getCollection<Invoice>('invoices');
            let newInvoices: Omit<Invoice, 'id'>[] = [];
            const today = startOfDay(new Date());

            for (const client of activeClients) {
                for (const clientPlan of client.plans) {
                    const plan = plansMap[clientPlan.planId];
                    if (!plan) continue;

                    const clientPlanInvoices = allInvoices.filter(inv => inv.clientId === client.id && inv.planId === clientPlan.planId);

                    if (plan.type === 'one-time') {
                        if (clientPlanInvoices.length === 0) {
                             newInvoices.push({
                                clientId: client.id,
                                clientName: client.name,
                                amount: plan.price,
                                issueDate: Timestamp.now(),
                                dueDate: clientPlan.planActivationDate,
                                status: 'Pendente' as const,
                                planId: clientPlan.planId,
                                planName: plan.name,
                            });
                        }
                        continue;
                    }
                    
                    if (plan.type === 'recurring' && plan.recurrencePeriod && plan.recurrenceValue) {
                        
                        let lastBilledDueDate = clientPlanInvoices.length > 0
                            ? clientPlanInvoices.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis())[0].dueDate.toDate()
                            : subDays(clientPlan.planActivationDate.toDate(), 1);

                        const activationDate = clientPlan.planActivationDate.toDate();
                        if ((isBefore(activationDate, today) || isEqual(startOfDay(activationDate), today)) && clientPlanInvoices.length === 0) {
                           newInvoices.push({
                                clientId: client.id,
                                clientName: client.name,
                                amount: plan.price,
                                issueDate: Timestamp.now(),
                                dueDate: Timestamp.fromDate(activationDate),
                                status: 'Pendente' as const,
                                planId: clientPlan.planId,
                                planName: plan.name,
                            });
                            lastBilledDueDate = activationDate;
                        }

                        while (true) {
                            let nextDueDate: Date;
                            switch (plan.recurrencePeriod) {
                                case 'dias': nextDueDate = addDays(lastBilledDueDate, plan.recurrenceValue); break;
                                case 'meses': nextDueDate = addMonths(lastBilledDueDate, plan.recurrenceValue); break;
                                case 'anos': nextDueDate = addYears(lastBilledDueDate, plan.recurrenceValue); break;
                                default: console.error("Invalid recurrence period for plan:", plan.id); continue;
                            }

                            if (isBefore(today, nextDueDate)) {
                                break;
                            }
                            
                            newInvoices.push({
                                clientId: client.id,
                                clientName: client.name,
                                amount: plan.price,
                                issueDate: Timestamp.now(),
                                dueDate: Timestamp.fromDate(nextDueDate),
                                status: 'Pendente' as const,
                                planId: clientPlan.planId,
                                planName: plan.name,
                            });
                            lastBilledDueDate = nextDueDate;
                        }
                    }
                }
            }


            if (newInvoices.length > 0) {
                const added = StorageService.addItems('invoices', newInvoices);
                setInvoices(prev => processInvoices([...prev, ...added]));
                toast({ title: "Sucesso!", description: `${newInvoices.length} nova(s) fatura(s) foram geradas.` });
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


    const handleUpdateStatus = async (invoiceId: string, status: 'Pendente' | 'Vencida') => {
       const updatedInvoice = StorageService.updateItem<Invoice>(invoiceId, {
            status,
            paymentDate: undefined,
            paymentMethod: undefined,
            paymentNotes: undefined
       });
       if(updatedInvoice) {
           setInvoices(prev => processInvoices(prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv)));
           toast({ title: "Sucesso", description: `Fatura marcada como ${status}.`});
       }
    };
    
    const handleOpenPaymentModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setPaymentDetails({
            paymentDate: new Date(),
            paymentMethod: undefined,
            paymentNotes: ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedInvoice || !paymentDetails.paymentDate || !paymentDetails.paymentMethod) {
            toast({ title: "Erro", description: "Data e tipo de pagamento são obrigatórios.", variant: "destructive" });
            return;
        }

        const updatedInvoice = StorageService.updateItem<Invoice>(selectedInvoice.id, {
            status: 'Paga',
            paymentDate: Timestamp.fromDate(paymentDetails.paymentDate!),
            paymentMethod: paymentDetails.paymentMethod,
            paymentNotes: paymentDetails.paymentNotes,
        });

        if (updatedInvoice) {
            setInvoices(prev => processInvoices(prev.map(inv => inv.id === selectedInvoice.id ? updatedInvoice : inv)));
            toast({ title: "Sucesso", description: `Fatura marcada como Paga.`});
        }

        setIsPaymentModalOpen(false);
        setSelectedInvoice(null);
    };


    const handlePrepareReminder = async (invoice: Invoice) => {
        const allClients: Client[] = StorageService.getCollection<Client>('clients');
        const client = allClients.find(c => c.id === invoice.clientId);

        if (!client || !client.whatsapp) {
            toast({
                title: 'Erro',
                description: 'O cliente não foi encontrado ou não possui um número de WhatsApp cadastrado.',
                variant: 'destructive',
            });
            return;
        }

        const allPlans: Plan[] = StorageService.getCollection<Plan>('plans');
        const plan = allPlans.find(p => p.id === invoice.planId);
        
        if (!plan) {
            toast({ title: 'Erro', description: 'Plano não encontrado para esta fatura.', variant: 'destructive'});
            return;
        }
        
        setClientForReminder(client);
        setSelectedInvoice(invoice);

        const dueDate = format(invoice.dueDate.toDate(), 'dd/MM/yyyy', { locale: ptBR });
        const amount = invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const serviceTypeText = plan.type === 'recurring' ? 'do seu plano' : 'do serviço';
        const text = `Olá, ${invoice.clientName}!\n\nEste é um lembrete sobre a fatura ${serviceTypeText} pendente.\n\nValor: ${amount}\nVencimento: ${dueDate}\n\nAgradecemos a sua atenção.`.trim();
        
        setReminderText(text);
        setIsReminderModalOpen(true);
    };
    
    const handleSendWhatsappReminder = () => {
        if (!clientForReminder || !clientForReminder.whatsapp) return;
        const phoneNumber = clientForReminder.whatsapp.replace(/\D/g, '');
        const encodedText = encodeURIComponent(reminderText);
        const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodedText}`;
        
        window.open(whatsappUrl, '_blank');
        setIsReminderModalOpen(false);
    }

    const handleDeleteInvoice = async (invoiceId: string) => {
        StorageService.deleteItem('invoices', invoiceId);
        setInvoices(prev => processInvoices(prev.filter(inv => inv.id !== invoiceId)));
        toast({ title: "Sucesso", description: "Fatura excluída com sucesso." });
    };

    const handleDeleteUnpaidInvoices = async (invoicesToDelete: Invoice[]) => {
        const unpaidInvoiceIds = invoicesToDelete
            .filter(inv => inv.status !== 'Paga')
            .map(inv => inv.id);

        if (unpaidInvoiceIds.length === 0) {
            toast({ title: "Nenhuma ação necessária", description: "Não há faturas pendentes ou vencidas para excluir." });
            return;
        }

        StorageService.deleteItems('invoices', unpaidInvoiceIds);
        setInvoices(prev => processInvoices(prev.filter(inv => !unpaidInvoiceIds.includes(inv.id))));
        toast({ title: "Sucesso!", description: `${unpaidInvoiceIds.length} fatura(s) foram excluídas.`});
    }
    
    const handlePrint = async (invoice: Invoice) => {
        try {
             if (!invoice.clientId || !invoice.planId) {
                toast({ title: 'Erro', description: 'Dados da fatura incompletos para impressão.', variant: 'destructive' });
                return;
            }
            
            const client = StorageService.getItem<Client>('clients', invoice.clientId);
            const plan = StorageService.getItem<Plan>('plans', invoice.planId);
            const company: CompanySettings | null = StorageService.getCollection<CompanySettings>('settings');

            if (!client || !plan) {
                toast({ title: 'Erro', description: 'Não foi possível encontrar os dados do cliente ou do plano.', variant: 'destructive' });
                return;
            }

            const dueDate = invoice.dueDate.toDate();
            let billingPeriod = format(dueDate, 'dd/MM/yyyy');
            if (plan.type === 'recurring' && plan.recurrencePeriod && plan.recurrenceValue) {
                let startDate: Date;
                switch (plan.recurrencePeriod) {
                    case 'dias': startDate = subDays(dueDate, plan.recurrenceValue); break;
                    case 'meses': startDate = subMonths(dueDate, plan.recurrenceValue); break;
                    case 'anos': startDate = subYears(dueDate, plan.recurrenceValue); break;
                    default: startDate = dueDate;
                }
                 startDate = addDays(startDate, 1);
                 billingPeriod = `${format(startDate, 'dd/MM/yyyy')} - ${format(dueDate, 'dd/MM/yyyy')}`;
            }

            
            const logoHtml = company?.logoDataUrl 
                ? `<img src="${company.logoDataUrl}" alt="Company Logo" style="max-height: 60px; max-width: 200px;" />` 
                : `<h1 class="text-2xl font-bold text-gray-800">${company?.name || 'Sua Empresa'}</h1>`;
            
            const companyDetailsHtml = [
                company?.address?.replace(/\n/g, '<br>'),
                company?.phone,
                company?.email,
                company?.website,
                company?.cpf ? `CPF: ${company.cpf}` : '',
                company?.cnpj ? `CNPJ: ${company.cnpj}` : ''
            ].filter(Boolean).join('<br>');


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
                        <body class="bg-gray-100 p-4 sm:p-8">
                            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 sm:p-12">
                                <div class="grid grid-cols-1 sm:grid-cols-2 items-start mb-12 gap-8">
                                    <div>
                                        ${logoHtml}
                                        ${company ? `<div class="text-gray-500 mt-4 text-sm">${companyDetailsHtml}</div>` : ''}
                                    </div>
                                    <div class="text-left sm:text-right">
                                        <h2 class="text-2xl font-bold text-gray-700">FATURA</h2>
                                        <p class="text-gray-500 mt-1">#${invoice.id.substring(0, 7).toUpperCase()}</p>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                                    <div>
                                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Cobrança para</h3>
                                        <p class="font-bold text-lg text-gray-800">${invoice.clientName}</p>
                                        <p class="text-gray-600">${client.email}</p>
                                    </div>
                                    <div class="text-left sm:text-right">
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
                                <div class="grid grid-cols-1 sm:grid-cols-2 mt-10 gap-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-800">Obrigado por sua preferência!</h4>
                                        ${company ? `<p class="text-sm text-gray-500">${company.name}</p>` : ''}
                                    </div>
                                    <div class="text-left sm:text-right">
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Faturas</h1>
                    <p className="text-muted-foreground">Gerencie e visualize todas as faturas.</p>
                </div>
                 <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleGenerateInvoices} disabled={isGenerating}>
                    <PlusCircle className="h-4 w-4" />
                    {isGenerating ? 'Gerando...' : 'Gerar Faturas'}
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Faturas</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="p-4 border rounded-lg">
                                    <Skeleton className="h-7 w-1/3 mb-4" />
                                    <div className="space-y-2">
                                       <Skeleton className="h-10 w-full" />
                                       <Skeleton className="h-10 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedInvoices).map(([clientId, { clientName, invoices: clientInvoices }]) => {
                             const paidInvoices = clientInvoices.filter(inv => inv.status === 'Paga');
                             const unpaidInvoices = clientInvoices.filter(inv => inv.status !== 'Paga');
 
                             const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                             const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
 
                             const paidCount = paidInvoices.length;
                             const unpaidCount = unpaidInvoices.length;

                            return (
                            <AccordionItem value={clientId} key={clientId}>
                                <div className="flex w-full justify-between items-center p-4 hover:bg-muted/50 rounded-lg flex-col sm:flex-row gap-4">
                                    <AccordionTrigger className="flex-1 text-left p-0 w-full">
                                       <div className="flex flex-col items-start gap-1">
                                            <span className="font-medium text-lg">{clientName}</span>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-xs">
                                                <span className="text-green-600 font-semibold">Pagas ({paidCount}): {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                <span className="text-muted-foreground font-semibold">Pendentes ({unpaidCount}): {totalUnpaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </div>
                                       </div>
                                    </AccordionTrigger>
                                    <div className='flex items-center gap-4 pl-0 sm:pl-4 w-full sm:w-auto justify-between'>
                                        <Badge variant="outline">{clientInvoices.length} fatura(s)</Badge>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="hidden md:inline">Excluir não pagas</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir faturas não pagas?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação não pode ser desfeita. Todas as faturas com status &quot;Pendente&quot; ou &quot;Vencida&quot; para <b>{clientName}</b> serão permanentemente excluídas. Faturas pagas não serão afetadas.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUnpaidInvoices(clientInvoices)}>Sim, Excluir</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fatura</TableHead>
                                                    <TableHead>Plano</TableHead>
                                                    <TableHead className="hidden md:table-cell">Data do Pagamento</TableHead>
                                                    <TableHead>Vencimento</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                    <TableHead><span className="sr-only">Ações</span></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {clientInvoices.map(invoice => (
                                                    <TableRow key={invoice.id}>
                                                        <TableCell className="font-medium">#{invoice.id.substring(0, 7).toUpperCase()}</TableCell>
                                                        <TableCell>{invoice.planName || 'N/A'}</TableCell>
                                                        <TableCell className="hidden md:table-cell">{invoice.paymentDate ? format(invoice.paymentDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                        <TableCell>{invoice.dueDate ? format(invoice.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusVariant(invoice.status)} className={cn("whitespace-nowrap", getStatusClass(invoice.status))}>
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
                                                                <Dialog open={isPaymentModalOpen && selectedInvoice?.id === invoice.id} onOpenChange={setIsPaymentModalOpen}>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                                <span className="sr-only">Toggle menu</span>
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                                            <DropdownMenuItem onClick={() => handleOpenPaymentModal(invoice)} disabled={invoice.status === 'Paga'}>Marcar como Paga</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Pendente')} disabled={invoice.status === 'Pendente'}>Marcar como Pendente</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handlePrepareReminder(invoice)}>Enviar Lembrete</DropdownMenuItem>
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
                                                                    <DialogContent className="sm:max-w-[425px]">
                                                                        <DialogHeader>
                                                                            <DialogTitle>Confirmar Pagamento</DialogTitle>
                                                                            <DialogDescription>
                                                                                Preencha os detalhes do pagamento para a fatura #{selectedInvoice?.id.substring(0, 7).toUpperCase()}.
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <div className="grid gap-4 py-4">
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="paymentDate" className="text-right">Data do Pagamento</Label>
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                    <Button
                                                                                        variant={"outline"}
                                                                                        className={cn(
                                                                                        "col-span-3 justify-start text-left font-normal",
                                                                                        !paymentDetails.paymentDate && "text-muted-foreground"
                                                                                        )}
                                                                                    >
                                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                        {paymentDetails.paymentDate ? format(paymentDetails.paymentDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                                                    </Button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-auto p-0">
                                                                                    <Calendar
                                                                                        mode="single"
                                                                                        selected={paymentDetails.paymentDate}
                                                                                        onSelect={(date) => setPaymentDetails(prev => ({...prev, paymentDate: date}))}
                                                                                        initialFocus
                                                                                    />
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </div>
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="paymentMethod" className="text-right">Tipo</Label>
                                                                                <Select onValueChange={(value) => setPaymentDetails(prev => ({...prev, paymentMethod: value as any}))}>
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder="Selecione o método" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="Pix">Pix</SelectItem>
                                                                                        <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                                                                        <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                            <div className="grid grid-cols-4 items-start gap-4">
                                                                                <Label htmlFor="paymentNotes" className="text-right pt-2">Observações</Label>
                                                                                <Textarea 
                                                                                    id="paymentNotes" 
                                                                                    className="col-span-3"
                                                                                    value={paymentDetails.paymentNotes}
                                                                                    onChange={(e) => setPaymentDetails(prev => ({...prev, paymentNotes: e.target.value}))}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <DialogFooter>
                                                                            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
                                                                            <Button type="submit" onClick={handleConfirmPayment}>Salvar Pagamento</Button>
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )})}
                    </Accordion>
                    )}
                </CardContent>
            </Card>
             <Dialog open={isReminderModalOpen} onOpenChange={setIsReminderModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar lembrete para {selectedInvoice?.clientName}</DialogTitle>
                        <DialogDescription>
                            Revise a mensagem abaixo antes de enviar para o WhatsApp.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-4">
                        <p className="whitespace-pre-wrap rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                            {reminderText}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReminderModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSendWhatsappReminder}>Enviar via WhatsApp</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
