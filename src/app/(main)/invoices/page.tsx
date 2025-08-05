"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

const invoices = [
    { id: "INV-001", client: "Inovatech Soluções", amount: 2500.00, issueDate: "01/07/2025", dueDate: "01/08/2025", status: "Paga" },
    { id: "INV-002", client: "Global-Trade Inc.", amount: 4800.00, issueDate: "02/07/2025", dueDate: "02/08/2025", status: "Paga" },
    { id: "INV-003", client: "Quantum Dynamics", amount: 1200.00, issueDate: "25/07/2025", dueDate: "25/08/2025", status: "Pendente" },
    { id: "INV-004", client: "Nexus-Enterprises", amount: 3000.00, issueDate: "20/06/2025", dueDate: "20/07/2025", status: "Vencida" },
    { id: "INV-005", client: "Inovatech Soluções", amount: 2500.00, issueDate: "01/08/2025", dueDate: "01/09/2025", status: "Pendente" },
];

export default function InvoicesPage() {

    const getStatusVariant = (status: string): VariantProps<typeof badgeVariants>['variant'] => {
        switch (status) {
            case 'Paga': return 'secondary';
            case 'Pendente': return 'outline';
            case 'Vencida': return 'destructive';
            default: return 'default';
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Faturas</h1>
                <Button size="sm" className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    Gerar Fatura Avulsa
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Faturas</CardTitle>
                    <CardDescription>Gerencie e visualize todas as faturas.</CardDescription>
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
                            {invoices.map(invoice => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.id}</TableCell>
                                    <TableCell>{invoice.client}</TableCell>
                                    <TableCell>{invoice.issueDate}</TableCell>
                                    <TableCell>{invoice.dueDate}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
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
                                                    <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                                    <DropdownMenuItem>Marcar como Paga</DropdownMenuItem>
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
