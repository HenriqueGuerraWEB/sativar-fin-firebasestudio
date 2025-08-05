"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

type Client = {
    id: string;
    name: string;
    taxId: string;
    contactName: string;
    email: string;
    status: "Ativo" | "Inativo";
};

const initialClients: Client[] = [
    { id: "1", name: "Inovatech Soluções", taxId: "12.345.678/0001-99", contactName: "Carlos Silva", email: "contato@inovatech.com", status: "Ativo" },
    { id: "2", name: "Global-Trade Inc.", taxId: "98.765.432/0001-11", contactName: "Ana Rodrigues", email: "ana.r@global-trade.com", status: "Ativo" },
    { id: "3", name: "Quantum Dynamics", taxId: "55.123.456/0001-77", contactName: "Pedro Almeida", email: "pedro@quantumdynamics.io", status: "Inativo" },
    { id: "4", name: "Nexus-Enterprises", taxId: "33.444.555/0001-01", contactName: "Mariana Costa", email: "mariana.c@nexus.com", status: "Ativo" },
];

const emptyClient: Omit<Client, 'id' | 'status'> = {
    name: "",
    taxId: "",
    contactName: "",
    email: "",
};

export default function ClientsPage() {
    const { toast } = useToast();
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Omit<Client, 'id' | 'status'> | Client>(emptyClient);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setCurrentClient(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveClient = () => {
        if (!currentClient.name || !currentClient.email) {
            toast({
                title: "Erro",
                description: "Nome e Email são campos obrigatórios.",
                variant: "destructive",
            });
            return;
        }

        if ('id' in currentClient) {
            // Edit
            setClients(clients.map(c => c.id === currentClient.id ? currentClient as Client : c));
            toast({ title: "Sucesso", description: "Cliente atualizado com sucesso." });
        } else {
            // Add
            const newClient: Client = {
                ...currentClient,
                id: (clients.length + 1).toString(),
                status: "Ativo",
            };
            setClients([...clients, newClient]);
            toast({ title: "Sucesso", description: "Cliente adicionado com sucesso." });
        }
        setIsSheetOpen(false);
        setCurrentClient(emptyClient);
    };

    const handleAddNew = () => {
        setCurrentClient(emptyClient);
        setIsSheetOpen(true);
    };

    const handleEdit = (client: Client) => {
        setCurrentClient(client);
        setIsSheetOpen(true);
    };

    const handleDelete = (clientId: string) => {
        setClients(clients.filter(c => c.id !== clientId));
        toast({ title: "Sucesso", description: "Cliente excluído com sucesso." });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Clientes</h1>
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
                                <Label htmlFor="contactName" className="text-right">Nome do Contato</Label>
                                <Input id="contactName" value={currentClient.contactName} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" value={currentClient.email} onChange={handleInputChange} className="col-span-3" />
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
                    <CardDescription>Gerencie seus clientes e visualize seus detalhes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.map(client => (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">
                                        <div>{client.name}</div>
                                        <div className="text-sm text-muted-foreground">{client.taxId}</div>
                                    </TableCell>
                                    <TableCell><Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'}>{client.status}</Badge></TableCell>
                                    <TableCell>
                                        <div>{client.contactName}</div>
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
                                                    <DropdownMenuItem>Ver Histórico</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Excluir</DropdownMenuItem>
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
                </CardContent>
            </Card>
        </div>
    );
}
