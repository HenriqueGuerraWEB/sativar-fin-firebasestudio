
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { VariantProps } from 'class-variance-authority';


type ExpenseCategory = {
    id: string;
    name: string;
};

type Expense = {
    id: string;
    description: string;
    category: string;
    amount: number;
    dueDate: Timestamp;
    status: 'Paga' | 'Pendente';
};

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

const emptyExpense: Omit<Expense, 'id' | 'status'> = {
    description: "",
    category: "",
    amount: 0,
    dueDate: Timestamp.now(),
};

export default function FinancePage() {
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Omit<Expense, 'id' | 'status'>>(emptyExpense);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const expenseQuery = query(collection(db, "expenses"), orderBy("dueDate", "desc"));
                const invoiceQuery = query(collection(db, "invoices"), orderBy("dueDate", "desc"));
                const categoryQuery = query(collection(db, "expenseCategories"), orderBy("name"));

                const [expenseSnapshot, invoiceSnapshot, categorySnapshot] = await Promise.all([
                    getDocs(expenseQuery),
                    getDocs(invoiceQuery),
                    getDocs(categoryQuery)
                ]);

                setExpenses(expenseSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
                setInvoices(invoiceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
                setCategories(categorySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ExpenseCategory)));

            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: "Erro", description: "Não foi possível carregar os dados financeiros.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();

        const expenseQuery = query(collection(db, "expenses"), orderBy("dueDate", "desc"));
        const invoiceQuery = query(collection(db, "invoices"), orderBy("dueDate", "desc"));
        const categoryQuery = query(collection(db, "expenseCategories"), orderBy("name"));

        const unsubExpenses = onSnapshot(expenseQuery, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
        });

        const unsubInvoices = onSnapshot(invoiceQuery, (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
        });
        
        const unsubCategories = onSnapshot(categoryQuery, (snapshot) => {
            setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ExpenseCategory)));
        });

        return () => {
            unsubExpenses();
            unsubInvoices();
            unsubCategories();
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
    
    const handleSelectChange = (value: string) => {
        setCurrentExpense(prev => ({...prev, category: value}));
    }

    const handleSaveExpense = async () => {
        if (!currentExpense.description || currentExpense.amount <= 0 || !currentExpense.category) {
            toast({ title: "Erro", description: "Descrição, Categoria e Valor (maior que zero) são obrigatórios.", variant: "destructive" });
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
    
    const handleUpdateExpenseStatus = async (expenseId: string, status: Expense['status']) => {
        try {
            const expenseRef = doc(db, "expenses", expenseId);
            await updateDoc(expenseRef, { status });
            toast({ title: "Sucesso", description: `Despesa marcada como ${status}.`});
        } catch (error) {
            console.error("Error updating expense status: ", error);
            toast({ title: "Erro", description: "Não foi possível atualizar o status da despesa.", variant: "destructive" });
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        try {
            await deleteDoc(doc(db, "expenses", expenseId));
            toast({ title: "Sucesso", description: "Despesa excluída com sucesso." });
        } catch (error) {
            console.error("Error deleting expense: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir a despesa.",
                variant: "destructive",
            });
        }
    };
    
    const handleUpdateInvoiceStatus = async (invoiceId: string, status: Invoice['status']) => {
        try {
            const invoiceRef = doc(db, "invoices", invoiceId);
            await updateDoc(invoiceRef, { status });
            toast({ title: "Sucesso", description: `Fatura marcada como ${status}.`});
        } catch (error) {
            console.error("Error updating status: ", error);
            toast({ title: "Erro", description: "Não foi possível atualizar o status da fatura.", variant: "destructive" });
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


    const handleSaveNewCategory = async () => {
        if (!newCategoryName.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
            return;
        }
        try {
            const newCategory = { name: newCategoryName };
            const docRef = await addDoc(collection(db, "expenseCategories"), newCategory);
            toast({ title: "Sucesso!", description: `Categoria "${newCategoryName}" adicionada.` });
            setCurrentExpense(prev => ({ ...prev, category: newCategoryName }));
            setNewCategoryName("");
            setIsCategoryDialogOpen(false);
        } catch (error) {
            console.error("Error saving new category: ", error);
            toast({ title: "Erro", description: "Não foi possível salvar a nova categoria.", variant: "destructive" });
        }
    };
    
    const handleAnalyze = () => {
        setIsAnalyzing(true);
        // Simulate AI analysis
        setTimeout(() => {
             const adobeCategory = categories.find(c => c.name.toLowerCase().includes('ferramentas'));
            setCurrentExpense({
                description: "Assinatura Adobe Creative Cloud",
                category: adobeCategory ? adobeCategory.name : "Ferramentas",
                amount: 280.00,
                dueDate: Timestamp.now(),
            })
            setIsAnalyzing(false);
            toast({ title: "Recibo analisado!", description: "Os dados foram preenchidos." });
        }, 2000);
    }
    
    const getInvoiceStatusVariant = (status: Invoice['status']): VariantProps<typeof badgeVariants>['variant'] => {
        switch (status) {
            case 'Paga': return 'secondary';
            case 'Pendente': return 'outline';
            case 'Vencida': return 'destructive';
            default: return 'default';
        }
    }

    const getInvoiceStatusClass = (status: Invoice['status']) => {
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
                                <div className="col-span-3 flex items-center gap-2">
                                    <Select value={currentExpense.category} onValueChange={handleSelectChange}>
                                        <SelectTrigger className="flex-grow">
                                            <SelectValue placeholder="Selecione uma categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(category => (
                                                <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     <AlertDialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Adicionar Nova Categoria</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Digite o nome da nova categoria de despesa.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <div className="py-2">
                                                <Input 
                                                    id="newCategoryName" 
                                                    value={newCategoryName} 
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    placeholder="Ex: Marketing"
                                                />
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleSaveNewCategory}>Salvar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
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
                                        <TableHead><span className="sr-only">Ações</span></TableHead>
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
                                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    )) : expenses.map(expense => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium">{expense.description}</TableCell>
                                            <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                                            <TableCell>{format(expense.dueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell><Badge variant={expense.status === 'Paga' ? 'secondary' : 'destructive'}>{expense.status}</Badge></TableCell>
                                            <TableCell className="text-right">{expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
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
                                                            <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(expense.id, 'Paga')} disabled={expense.status === 'Paga'}>
                                                                Marcar como Paga
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleUpdateExpenseStatus(expense.id, 'Pendente')} disabled={expense.status === 'Pendente'}>
                                                                Marcar como Pendente
                                                            </DropdownMenuItem>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                        Excluir
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Essa ação não pode ser desfeita. Isso excluirá permanentemente a despesa.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>Excluir</AlertDialogAction>
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
                </TabsContent>
                 <TabsContent value="income">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contas a Receber</CardTitle>
                            <CardDescription>Visualize as faturas pendentes e pagas dos clientes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead><span className="sr-only">Ações</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? Array.from({length: 4}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    )) : invoices.map(invoice => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.clientName}</TableCell>
                                            <TableCell>{format(invoice.dueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={getInvoiceStatusVariant(invoice.status)} className={getInvoiceStatusClass(invoice.status)}>
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
                                                            <DropdownMenuItem onClick={() => handleUpdateInvoiceStatus(invoice.id, 'Paga')} disabled={invoice.status === 'Paga'}>
                                                                Marcar como Paga
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleUpdateInvoiceStatus(invoice.id, 'Pendente')} disabled={invoice.status === 'Pendente' || invoice.status === 'Vencida'}>
                                                                Marcar como Pendente
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                        Excluir
                                                                    </DropdownMenuItem>
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

    