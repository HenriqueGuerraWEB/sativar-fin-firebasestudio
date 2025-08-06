
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
import { collection, onSnapshot, query, Timestamp, orderBy, addDoc, doc, updateDoc, getDocs } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Client = {
    id: string;
    name: string;
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

const emptyInvoice: Omit<Invoice, 'id' | 'issueDate' | 'status'> = {
    clientId: '',
    clientName: '',
    amount: 0,
    dueDate: Timestamp.now(),
}

export default function InvoicesPage() {
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState(emptyInvoice);
    
    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "invoices"), orderBy("issueDate", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const invoicesData: Invoice[] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
            setInvoices(invoicesData);
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

        const fetchClients = async () => {
            const clientQuery = query(collection(db, "clients"));
            const clientSnapshot = await getDocs(clientQuery);
            const clientsData = clientSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Client));
            setClients(clientsData);
        }
        
        fetchClients();

        return () => unsubscribe();
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === 'dueDate') {
            setCurrentInvoice(prev => ({ ...prev, [id]: Timestamp.fromDate(new Date(value)) }));
        } else if (id === 'amount') {
             const numValue = parseFloat(value);
             setCurrentInvoice(prev => ({ ...prev, [id]: isNaN(numValue) ? 0 : numValue }));
        }
    };
    
    const handleClientSelect = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setCurrentInvoice(prev => ({ ...prev, clientId: client.id, clientName: client.name }));
        }
    }

    const handleSaveInvoice = async () => {
        if (!currentInvoice.clientId || currentInvoice.amount <= 0) {
            toast({ title: "Erro", description: "Cliente e Valor (maior que zero) são obrigatórios.", variant: "destructive" });
            return;
        }

        try {
            await addDoc(collection(db, "invoices"), {
                ...currentInvoice,
                status: "Pendente",
                issueDate: Timestamp.now(),
            });
            toast({ title: "Sucesso", description: "Fatura gerada com sucesso." });
            setIsSheetOpen(false);
            setCurrentInvoice(emptyInvoice);
        } catch (error) {
            console.error("Error saving invoice: ", error);
            toast({ title: "Erro", description: "Não foi possível gerar a fatura.", variant: "destructive" });
        }
    };

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
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1" onClick={() => setCurrentInvoice(emptyInvoice)}>
                            <PlusCircle className="h-4 w-4" />
                            Gerar Fatura
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Gerar nova fatura</SheetTitle>
                            <SheetDescription>
                                Preencha os detalhes da fatura.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="client" className="text-right">Cliente</Label>
                                <Select onValueChange={handleClientSelect} value={currentInvoice.clientId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione um cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Valor (R$)</Label>
                                <Input id="amount" type="number" value={currentInvoice.amount} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dueDate" className="text-right">Vencimento</Label>
                                <Input id="dueDate" type="date" onChange={handleInputChange} className="col-span-3" defaultValue={format(currentInvoice.dueDate.toDate(), 'yyyy-MM-dd')} />
                            </div>
                        </div>
                        <SheetFooter>
                            <Button onClick={handleSaveInvoice}>Salvar Fatura</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
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
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'Vencida')} disabled={invoice.status === 'Vencida'}>Marcar como Vencida</DropdownMenuItem>
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

    
