"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const clients = [
    { id: "1", name: "Inovatech Soluções", taxId: "12.345.678/0001-99", contactName: "Carlos Silva", email: "contato@inovatech.com", status: "Ativo" },
    { id: "2", name: "Global-Trade Inc.", taxId: "98.765.432/0001-11", contactName: "Ana Rodrigues", email: "ana.r@global-trade.com", status: "Ativo" },
    { id: "3", name: "Quantum Dynamics", taxId: "55.123.456/0001-77", contactName: "Pedro Almeida", email: "pedro@quantumdynamics.io", status: "Inativo" },
    { id: "4", name: "Nexus-Enterprises", taxId: "33.444.555/0001-01", contactName: "Mariana Costa", email: "mariana.c@nexus.com", status: "Ativo" },
];

export default function ClientsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Novo Cliente
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Adicionar novo cliente</SheetTitle>
                            <SheetDescription>
                                Preencha os detalhes do novo cliente. Clique em salvar quando terminar.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nome/Razão Social</Label>
                                <Input id="name" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="taxId" className="text-right">CPF/CNPJ</Label>
                                <Input id="taxId" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contactName" className="text-right">Nome do Contato</Label>
                                <Input id="contactName" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">Telefone</Label>
                                <Input id="phone" className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">Endereço</Label>
                                <Input id="address" className="col-span-3" />
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type="submit">Salvar</Button>
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                                <DropdownMenuItem>Ver Histórico</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
