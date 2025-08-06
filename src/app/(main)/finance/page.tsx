
"use client";

import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type Expense = {
    id: string;
    description: string;
    category: 'Recursos Humanos' | 'Marketing' | 'Infraestrutura' | 'Ferramentas' | 'Outros';
    amount: number;
    dueDate: Timestamp;
    status: 'Paga' | 'Pendente';
};

type Income = {
    id: string;
    description: string;
    amount: number;
    date: Timestamp;
};

const emptyExpense: Omit<Expense, 'id' | 'status'> = {
    description: "",
    category: "Outros",
    amount: 0,
    dueDate: Timestamp.now(),
};

export default function FinancePage() {
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [income, setIncome] = useState<Income[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Omit<Expense, 'id' | 'status'>>(emptyExpense);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const expenseQuery = query(collection(db, "expenses"), orderBy("dueDate", "desc"));
                const incomeQuery = query(collection(db, "income"), orderBy("date", "desc"));

                const [expenseSnapshot, incomeSnapshot] = await Promise.all([
                    getDocs(expenseQuery),
                    getDocs(incomeQuery)
                ]);

                setExpenses(expenseSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
                setIncome(incomeSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Income)));

            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: "Erro", description: "Não foi possível carregar os dados financeiros.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();

        const expenseQuery = query(collection(db, "expenses"), orderBy("dueDate", "desc"));
        const incomeQuery = query(collection(db, "income"), orderBy("date", "desc"));

        const unsubExpenses = onSnapshot(expenseQuery, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
        });

        const unsubIncome = onSnapshot(incomeQuery, (snapshot) => {
            setIncome(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Income)));
        });

        return () => {
            unsubExpenses();
            unsubIncome();
        };
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === 'dueDate') {
            setCurrentExpense(prev => ({ ...prev, [id]: Timestamp.fromDate(new Date(value)) }));
        } else if (id === 'amount') {
             const numValue = parseFloat(value);
             setCurrentExpense(prev => ({ ...prev, [id]: isNaN(numValue) ? 0 : numValue }));
        } else {
            setCurrentExpense(prev => ({ ...prev, [id]: value }));
        }
    };
    
    const handleSelectChange = (value: Expense['category']) => {
        setCurrentExpense(prev => ({...prev, category: value}));
    }

    const handleSaveExpense = async () => {
        if (!currentExpense.description || currentExpense.amount <= 0) {
            toast({ title: "Erro", description: "Descrição e Valor (maior que zero) são obrigatórios.", variant: "destructive" });
            return;
        }

        try {
            await addDoc(collection(db, "expenses"), {
                ...currentExpense,
                status: "Pendente",
            });
            toast({ title: "Sucesso", description: "Despesa adicionada com sucesso." });
            setIsSheetOpen(false);
            setCurrentExpense(emptyExpense);
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Erro", description: "Não foi possível salvar a despesa.", variant: "destructive" });
        }
    };
    
    const handleAnalyze = () => {
        setIsAnalyzing(true);
        // Simulate AI analysis
        setTimeout(() => {
            setCurrentExpense({
                description: "Assinatura Adobe Creative Cloud",
                category: "Ferramentas",
                amount: 280.00,
                dueDate: Timestamp.now(),
            })
            setIsAnalyzing(false);
            toast({ title: "Recibo analisado!", description: "Os dados foram preenchidos." });
        }, 2000);
    }


    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
                    <p className="text-muted-foreground">Acompanhe as finanças da sua empresa.</p>
                </div>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1" onClick={() => { setCurrentExpense(emptyExpense); setIsSheetOpen(true); }}>
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
                                <Input id="description" value={currentExpense.description} onChange={handleInputChange} className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Categoria</Label>
                                <Select value={currentExpense.category} onValueChange={handleSelectChange}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                                        <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                                        <SelectItem value="Outros">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Valor (R$)</Label>
                                <Input id="amount" type="number" value={currentExpense.amount} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dueDate" className="text-right">Vencimento</Label>
                                <Input id="dueDate" type="date" onChange={handleInputChange} className="col-span-3" defaultValue={format(currentExpense.dueDate.toDate(), 'yyyy-MM-dd')} />
                            </div>
                        </div>
                        <SheetFooter>
                            <Button onClick={handleSaveExpense}>Salvar Despesa</Button>
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
                                    {isLoading ? Array.from({length: 3}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    )) : expenses.map(expense => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium">{expense.description}</TableCell>
                                            <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                                            <TableCell>{format(expense.dueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
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
                                   {isLoading ? Array.from({length: 2}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    )) : income.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell>{format(item.date.toDate(), 'dd/MM/yyyy')}</TableCell>
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

    