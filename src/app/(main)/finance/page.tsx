
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const expenses = [
    { id: "1", description: "Salário - Designer", category: "Recursos Humanos", amount: 4500.00, dueDate: "05/08/2025", status: "Paga" },
    { id: "2", description: "Assinatura Figma", category: "Ferramentas", amount: 250.00, dueDate: "10/08/2025", status: "Pendente" },
    { id: "3", description: "Aluguel Escritório", category: "Infraestrutura", amount: 3000.00, dueDate: "15/08/2025", status: "Pendente" },
];

const income = [
    { id: "1", description: "Pagamento Fatura #123 - Inovatech", amount: 2500.00, date: "01/08/2025" },
    { id: "2", description: "Pagamento Fatura #124 - Global-Trade", amount: 4800.00, date: "02/08/2025" },
];

export default function FinancePage() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
        }, 2000);
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
                    <p className="text-muted-foreground">Acompanhe as finanças da sua empresa.</p>
                </div>
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Lançar Despesa
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Lançar nova despesa</SheetTitle>
                            <SheetDescription>
                                Preencha os detalhes da despesa. Você pode anexar um recibo.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Recibo</Label>
                                <div className='col-span-3 flex gap-2'>
                                    <Input id="receipt" type="file" className="flex-grow" />
                                    <Button onClick={handleAnalyze} disabled={isAnalyzing} size="icon" variant="outline" aria-label="Analisar com IA">
                                        {isAnalyzing ? <Sparkles className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Descrição</Label>
                                <Input id="description" className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Categoria</Label>
                                <Select>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rh">Recursos Humanos</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                        <SelectItem value="infra">Infraestrutura</SelectItem>
                                        <SelectItem value="tools">Ferramentas</SelectItem>
                                        <SelectItem value="others">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Valor (R$)</Label>
                                <Input id="amount" type="number" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dueDate" className="text-right">Vencimento</Label>
                                <Input id="dueDate" type="date" className="col-span-3" />
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type="submit">Salvar Despesa</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
            
            <Tabs defaultValue="expenses" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="expenses">Contas a Pagar</TabsTrigger>
                    <TabsTrigger value="income">Contas a Receber</TabsTrigger>
                    <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
                </TabsList>
                <TabsContent value="expenses">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contas a Pagar</CardTitle>
                            <CardDescription>Visualize e gerencie as despesas da empresa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map(expense => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium">{expense.description}</TableCell>
                                            <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                                            <TableCell>{expense.dueDate}</TableCell>
                                            <TableCell><Badge variant={expense.status === 'Paga' ? 'secondary' : 'destructive'}>{expense.status}</Badge></TableCell>
                                            <TableCell className="text-right">{expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="income">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contas a Receber</CardTitle>
                            <CardDescription>Visualize as entradas de capital.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {income.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell>{item.date}</TableCell>
                                            <TableCell className="text-right">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="cashflow">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fluxo de Caixa</CardTitle>
                            <CardDescription>Relatório de entradas e saídas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center h-48">
                                <p className="text-center text-muted-foreground">O relatório de fluxo de caixa será implementado em breve.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
