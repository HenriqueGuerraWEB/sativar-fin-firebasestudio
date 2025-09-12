
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePlans, Plan } from '@/hooks/use-plans';
import { useClients, Client, ClientPlan } from '@/hooks/use-clients';


const emptyClient: Omit<Client, 'id' | 'status' | 'createdAt'> = {
    name: "",
    taxId: "",
    contactName: "",
    email: "",
    phone: "",
    whatsapp: "",
    notes: "",
    plans: [],
};

export default function ClientsPage() {
    const { toast } = useToast();
    const { clients, isLoading: clientsLoading, addClient, updateClient, deleteClient } = useClients();
    const { plans, isLoading: plansLoading } = usePlans();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Omit<Client, 'id' | 'status' | 'createdAt'> | Client>(emptyClient);

    const isLoading = clientsLoading || plansLoading;

    const plansMap = useMemo(() => {
        return plans.reduce((acc, plan) => {
            acc[plan.id] = plan.name;
            return acc;
        }, {} as Record<string, string>);
    }, [plans]);

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 3) return `(${phoneNumber}`;
        if (phoneNumberLength < 8) {
            return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
        }
        return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        if (id === 'phone' || id === 'whatsapp') {
            const formattedValue = formatPhoneNumber(value);
            setCurrentClient(prev => ({ ...prev, [id]: formattedValue }));
        } else {
            setCurrentClient(prev => ({ ...prev, [id]: value }));
        }
    };
    
    const handlePlanChange = (index: number, planId: string) => {
        const newPlans = [...(currentClient.plans || [])];
        newPlans[index].planId = planId;
        setCurrentClient(prev => ({...prev, plans: newPlans}));
    }
    
    const handleDateChange = (index: number, date: Date | undefined) => {
        if (date) {
            const newPlans = [...(currentClient.plans || [])];
            newPlans[index].planActivationDate = date;
            setCurrentClient(prev => ({ ...prev, plans: newPlans }));
        }
    }
    
    const addPlanToClient = () => {
        const newPlan: ClientPlan = { planId: '', planActivationDate: new Date() };
        setCurrentClient(prev => ({...prev, plans: [...(prev.plans || []), newPlan]}));
    }
    
    const removePlanFromClient = (index: number) => {
        const newPlans = (currentClient.plans || []).filter((_, i) => i !== index);
        setCurrentClient(prev => ({...prev, plans: newPlans}));
    }


    const handleSaveClient = async () => {
        if (!currentClient.name || !currentClient.email) {
            toast({
                title: "Erro",
                description: "Nome e Email são campos obrigatórios.",
                variant: "destructive",
            });
            return;
        }

        if (currentClient.plans.some(p => !p.planId)) {
             toast({
                title: "Erro",
                description: "Todos os planos adicionados devem ser selecionados.",
                variant: "destructive",
            });
            return;
        }

        try {
            if ('id' in currentClient) {
                const { id, ...clientData } = currentClient;
                await updateClient(id, clientData);
                toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." });
            } else {
                await addClient({
                    ...currentClient,
                    status: "Ativo",
                });
                toast({ title: "Sucesso", description: "Cliente adicionado com sucesso." });
            }
            setIsSheetOpen(false);
            setCurrentClient(emptyClient);
        } catch (error) {
            console.error("Error saving client: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar o cliente.",
                variant: "destructive",
            });
        }
    };

    const handleAddNew = () => {
        setCurrentClient(emptyClient);
        setIsSheetOpen(true);
    };

    const handleEdit = (client: Client) => {
        setCurrentClient({ ...client, plans: client.plans || [] });
        setIsSheetOpen(true);
    };

    const handleDelete = async (clientId: string) => {
        try {
            await deleteClient(clientId);
            toast({ title: "Sucesso", description: "Cliente excluído com sucesso." });
        } catch (error) {
            console.error("Error deleting client: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir o cliente.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus clientes e visualize seus detalhes.</p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={(isOpen) => {
                    setIsSheetOpen(isOpen);
                    if (!isOpen) setCurrentClient(emptyClient);
                }}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleAddNew}>
                            <PlusCircle className="h-4 w-4" />
                            Novo Cliente
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto w-full max-w-2xl sm:max-w-2xl">
                        <SheetHeader>
                            <SheetTitle>{'id' in currentClient ? 'Editar Cliente' : 'Adicionar novo cliente'}</SheetTitle>
                            <SheetDescription>
                                Preencha os detalhes do cliente. Clique em salvar quando terminar.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-6 py-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome/Razão Social</Label>
                                    <Input id="name" value={currentClient.name} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxId">CPF/CNPJ</Label>
                                    <Input id="taxId" value={currentClient.taxId} onChange={handleInputChange} />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <Label>Planos</Label>
                                <div className="space-y-3">
                                    {currentClient.plans?.map((clientPlan, index) => (
                                        <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center p-3 border rounded-lg">
                                            <div className="sm:col-span-3">
                                                <Label className="text-xs text-muted-foreground">Plano</Label>
                                                <Select onValueChange={(planId) => handlePlanChange(index, planId)} value={clientPlan.planId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um plano" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {plans.map(plan => (
                                                            <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <Label className="text-xs text-muted-foreground">Data de Ativação</Label>
                                                 <Popover>
                                                    <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !clientPlan.planActivationDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {clientPlan.planActivationDate ? format(clientPlan.planActivationDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                    </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={clientPlan.planActivationDate}
                                                        onSelect={(date) => handleDateChange(index, date)}
                                                        initialFocus
                                                    />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="sm:col-span-1 pt-5 flex justify-end">
                                                 <Button variant="destructive" size="icon" onClick={() => removePlanFromClient(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={addPlanToClient}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Plano
                                </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="contactName">Nome do Contato</Label>
                                    <Input id="contactName" value={currentClient.contactName} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={currentClient.email} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input id="phone" value={currentClient.phone} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp">Whatsapp</Label>
                                    <Input id="whatsapp" value={currentClient.whatsapp} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Observações</Label>
                                <Textarea id="notes" value={currentClient.notes} onChange={handleInputChange} />
                            </div>

                        </div>
                        <SheetFooter>
                            <Button onClick={handleSaveClient}>Salvar</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="hidden sm:table-cell">Planos</TableHead>
                                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead><span className="sr-only">Ações</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="mt-2 h-4 w-40" />
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-28" />
                                            <Skeleton className="mt-2 h-4 w-36" />
                                        </TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                    ))
                                ) : clients.map(client => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">
                                            <div className="font-medium">{client.name}</div>
                                            <div className="text-sm text-muted-foreground">{client.taxId}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className="flex flex-col space-y-1">
                                                {(client.plans && client.plans.length > 0) ? client.plans.map((p, i) => (
                                                    <Badge key={i} variant="secondary">{plansMap[p.planId] || 'Plano desconhecido'}</Badge>
                                                )) : 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell"><Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'} className={client.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : ''}>{client.status}</Badge></TableCell>
                                        <TableCell>
                                            <div className="font-medium">{client.contactName}</div>
                                            <div className="text-sm text-muted-foreground">{client.email}</div>
                                        </TableCell>
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
                                                        <DropdownMenuItem onClick={() => handleEdit(client)}>Editar</DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o cliente.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(client.id)}>Excluir</AlertDialogAction>
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
