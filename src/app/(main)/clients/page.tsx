
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Plan = {
    id: string;
    name: string;
};

type Client = {
    id: string;
    name: string;
    taxId: string;
    contactName: string;
    email: string;
    phone: string;
    whatsapp: string;
    notes: string;
    status: "Ativo" | "Inativo";
    planId?: string;
};

const emptyClient: Omit<Client, 'id' | 'status'> = {
    name: "",
    taxId: "",
    contactName: "",
    email: "",
    phone: "",
    whatsapp: "",
    notes: "",
    planId: undefined,
};

export default function ClientsPage() {
    const { toast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Omit<Client, 'id' | 'status'> | Client>(emptyClient);

    const plansMap = useMemo(() => {
        return plans.reduce((acc, plan) => {
            acc[plan.id] = plan.name;
            return acc;
        }, {} as Record<string, string>);
    }, [plans]);

     useEffect(() => {
        setIsLoading(true);
        const clientQuery = query(collection(db, "clients"));
        const planQuery = query(collection(db, "plans"));

        const unsubClients = onSnapshot(clientQuery, (querySnapshot) => {
            const clientsData: Client[] = [];
            querySnapshot.forEach((doc) => {
                clientsData.push({ ...doc.data(), id: doc.id } as Client);
            });
            setClients(clientsData);
            if(plans.length > 0) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching clients: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os clientes.",
                variant: "destructive",
            });
            setIsLoading(false);
        });

        const unsubPlans = onSnapshot(planQuery, (querySnapshot) => {
            const plansData: Plan[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                plansData.push({ id: doc.id, name: data.name } as Plan);
            });
            setPlans(plansData);
             if(clients.length > 0 || querySnapshot.empty) setIsLoading(false);
        }, (error) => {
             console.error("Error fetching plans: ", error);
             toast({
                title: "Erro",
                description: "Não foi possível carregar os planos.",
                variant: "destructive",
            });
            setIsLoading(false);
        });


        return () => {
            unsubClients();
            unsubPlans();
        };
    }, [toast]);

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
    
    const handlePlanSelect = (planId: string) => {
        setCurrentClient(prev => ({ ...prev, planId: planId === 'none' ? undefined : planId }));
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

        try {
            if ('id' in currentClient) {
                // Edit
                const clientRef = doc(db, "clients", currentClient.id);
                const { id, ...clientData } = currentClient;
                await updateDoc(clientRef, clientData);
                toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." });
            } else {
                // Add
                await addDoc(collection(db, "clients"), {
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
        setCurrentClient(client);
        setIsSheetOpen(true);
    };

    const handleDelete = async (clientId: string) => {
        try {
            await deleteDoc(doc(db, "clients", clientId));
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
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus clientes e visualize seus detalhes.</p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1" onClick={handleAddNew}>
                            <PlusCircle className="h-4 w-4" />
                            Novo Cliente
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>{'id' in currentClient ? 'Editar Cliente' : 'Adicionar novo cliente'}</SheetTitle>
                            <SheetDescription>
                                Preencha os detalhes do cliente. Clique em salvar quando terminar.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nome/Razão Social</Label>
                                <Input id="name" value={currentClient.name} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="taxId" className="text-right">CPF/CNPJ</Label>
                                <Input id="taxId" value={currentClient.taxId} onChange={handleInputChange} className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plan" className="text-right">Plano</Label>
                                <Select onValueChange={handlePlanSelect} value={currentClient.planId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione um plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum</SelectItem>
                                        {plans.map(plan => (
                                            <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contactName" className="text-right">Nome do Contato</Label>
                                <Input id="contactName" value={currentClient.contactName} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" value={currentClient.email} onChange={handleInputChange} className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">Telefone</Label>
                                <Input id="phone" value={currentClient.phone} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="whatsapp" className="text-right">Whatsapp</Label>
                                <Input id="whatsapp" value={currentClient.whatsapp} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="notes" className="text-right pt-2">Observações</Label>
                                <Textarea id="notes" value={currentClient.notes} onChange={handleInputChange} className="col-span-3" />
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
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Status</TableHead>
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
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
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
                                        <TableCell>{client.planId ? plansMap[client.planId] : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'} className={client.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : ''}>{client.status}</Badge></TableCell>
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
