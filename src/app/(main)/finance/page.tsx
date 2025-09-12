
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Sparkles, TrendingUp, TrendingDown, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, getMonth, getYear, subYears, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { VariantProps } from 'class-variance-authority';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StorageService } from '@/lib/storage-service';


type ExpenseCategory = {
    id: string;
    name: string;
};

type Expense = {
    id: string;
    description: string;
    category: string;
    amount: number;
    dueDate: Date;
    status: 'Paga' | 'Pendente';
};

type Invoice = {
    id: string;
    clientName: string;
    clientId: string;
    amount: number;
    issueDate: Date;
    dueDate: Date;
    status: 'Paga' | 'Pendente' | 'Vencida';
    planId: string;
};

const emptyExpense: Omit<Expense, 'id' | 'status'> = {
    description: "",
    category: "",
    amount: 0,
    dueDate: new Date(),
};

type CashFlowData = {
    name: string;
    Entradas: number;
    Saídas: number;
};

type Transaction = {
    id: string;
    date: Date;
    description: string;
    amount: number;
    type: 'Entrada' | 'Saída';
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
    
    // State for cash flow date range
    const [currentDate, setCurrentDate] = useState(new Date());
    const [cashFlowView, setCashFlowView] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
    
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [storedExpenses, storedInvoices, storedCategories] = await Promise.all([
                StorageService.getCollection<Expense>('expenses'),
                StorageService.getCollection<Invoice>('invoices'),
                StorageService.getCollection<ExpenseCategory>('expenseCategories'),
            ]);
            
            setExpenses(storedExpenses.sort((a: Expense, b: Expense) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
            setInvoices(storedInvoices.sort((a: Invoice, b: Invoice) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
            setCategories(storedCategories.sort((a: ExpenseCategory, b: ExpenseCategory) => a.name.localeCompare(b.name)));
            
            setIsLoading(false);
        };
        loadData();
    }, []);
    
    const cashFlowReport = useMemo(() => {
        let start, end;
        if (cashFlowView === 'daily') {
            start = startOfDay(currentDate);
            end = endOfDay(currentDate);
        } else if (cashFlowView === 'monthly') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else { // yearly
            start = startOfYear(currentDate);
            end = endOfYear(currentDate);
        }

        const paidInvoices = invoices.filter(inv => inv.status === 'Paga' && new Date(inv.dueDate) >= start && new Date(inv.dueDate) <= end);
        const paidExpenses = expenses.filter(exp => exp.status === 'Paga' && new Date(exp.dueDate) >= start && new Date(exp.dueDate) <= end);

        const totalIncome = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalExpenses = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const balance = totalIncome - totalExpenses;

        const transactions: Transaction[] = [
            ...paidInvoices.map(inv => ({ id: inv.id, date: new Date(inv.dueDate), description: `Fatura: ${inv.clientName}`, amount: inv.amount, type: 'Entrada' as const })),
            ...paidExpenses.map(exp => ({ id: exp.id, date: new Date(exp.dueDate), description: exp.description, amount: exp.amount, type: 'Saída' as const })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime());
        
        let chartData: CashFlowData[] = [];
        if (cashFlowView === 'monthly') {
            const days = eachDayOfInterval({ start, end });
            chartData = days.map(day => ({
                name: format(day, 'dd'),
                Entradas: 0,
                Saídas: 0,
            }));
        } else if (cashFlowView === 'yearly') {
             const months = eachMonthOfInterval({ start, end });
             chartData = months.map(month => ({
                name: format(month, 'MMM', { locale: ptBR }),
                Entradas: 0,
                Saídas: 0,
            }));
        }

        paidInvoices.forEach(inv => {
            const invDate = new Date(inv.dueDate);
            if (cashFlowView === 'monthly') {
                const dayIndex = invDate.getDate() - 1;
                if (chartData[dayIndex]) chartData[dayIndex].Entradas += inv.amount;
            } else if (cashFlowView === 'yearly') {
                const monthIndex = getMonth(invDate);
                if (chartData[monthIndex]) chartData[monthIndex].Entradas += inv.amount;
            }
        });
        paidExpenses.forEach(exp => {
             const expDate = new Date(exp.dueDate);
            if (cashFlowView === 'monthly') {
                const dayIndex = expDate.getDate() - 1;
                if(chartData[dayIndex]) chartData[dayIndex].Saídas += exp.amount;
            } else if (cashFlowView === 'yearly') {
                const monthIndex = getMonth(expDate);
                if(chartData[monthIndex]) chartData[monthIndex].Saídas += exp.amount;
            }
        });


        return { totalIncome, totalExpenses, balance, transactions, chartData, start, end };
    }, [invoices, expenses, currentDate, cashFlowView]);
    
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setCurrentDate(date);
        }
    }
    
    const formatCashFlowTitle = () => {
        if (cashFlowView === 'daily') return format(currentDate, 'PPP', { locale: ptBR });
        if (cashFlowView === 'monthly') return format(currentDate, 'MMMM \'de\' yyyy', { locale: ptBR });
        return format(currentDate, 'yyyy');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === 'dueDate') {
            setCurrentExpense(prev => ({ ...prev, [id]: new Date(value) }));
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

        const newExpenseData: Omit<Expense, 'id'> = {
            ...currentExpense,
            status: "Pendente",
        };

        const addedExpense = await StorageService.addItem<Expense>('expenses', newExpenseData);
        setExpenses(prev => [...prev, addedExpense].sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));

        toast({ title: "Sucesso", description: "Despesa adicionada com sucesso." });
        setIsSheetOpen(false);
        setCurrentExpense(emptyExpense);
    };
    
    const handleUpdateExpenseStatus = async (expenseId: string, status: Expense['status']) => {
        const updatedExpense = await StorageService.updateItem<Expense>('expenses', expenseId, { status });
        if (updatedExpense) {
            setExpenses(prev => prev.map(exp => exp.id === expenseId ? updatedExpense : exp));
            toast({ title: "Sucesso", description: `Despesa marcada como ${status}.`});
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        await StorageService.deleteItem('expenses', expenseId);
        setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
        toast({ title: "Sucesso", description: "Despesa excluída com sucesso." });
    };

    const handleSaveNewCategory = async () => {
        if (!newCategoryName.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode estar vazio.", variant: "destructive" });
            return;
        }
       
        const newCategory = await StorageService.addItem<ExpenseCategory>('expenseCategories', { name: newCategoryName });
        setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));

        toast({ title: "Sucesso!", description: `Categoria "${newCategoryName}" adicionada.` });
        setCurrentExpense(prev => ({ ...prev, category: newCategory.id }));
        setNewCategoryName("");
        setIsCategoryDialogOpen(false);
    };
    
    const handleAnalyze = () => {
        setIsAnalyzing(true);
        // Simulate AI analysis
        setTimeout(() => {
             const adobeCategory = categories.find(c => c.name.toLowerCase().includes('ferramentas'));
            setCurrentExpense({
                description: "Assinatura Adobe Creative Cloud",
                category: adobeCategory ? adobeCategory.id : "",
                amount: 280.00,
                dueDate: new Date(),
            })
            setIsAnalyzing(false);
            toast({ title: "Recibo analisado!", description: "Os dados foram preenchidos." });
        }, 2000);
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
                    <p className="text-muted-foreground">Acompanhe as finanças da sua empresa.</p>
                </div>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={() => { setCurrentExpense(emptyExpense); setIsSheetOpen(true); }}>
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
                                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
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
                                <Input id="dueDate" type="date" onChange={handleInputChange} className="col-span-3" defaultValue={format(currentExpense.dueDate, 'yyyy-MM-dd')} />
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
                             <div className="overflow-x-auto">
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
                                                <TableCell><Badge variant="outline">{categories.find(c => c.id === expense.category)?.name || 'N/A'}</Badge></TableCell>
                                                <TableCell>{format(new Date(expense.dueDate), 'dd/MM/yyyy')}</TableCell>
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
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="income">
                     <Card>
                        <CardHeader>
                            <CardTitle>Entradas Recebidas</CardTitle>
                            <CardDescription>Visualize o histórico de faturas pagas pelos clientes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Data do Pagamento</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {isLoading ? Array.from({length: 4}).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                            </TableRow>
                                        )) : invoices.filter(invoice => invoice.status === 'Paga').map(invoice => (
                                            <TableRow key={invoice.id}>
                                                <TableCell className="font-medium">{invoice.clientName}</TableCell>
                                                <TableCell>{format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="cashflow">
                    <Card>
                        <CardHeader>
                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle>Fluxo de Caixa</CardTitle>
                                    <CardDescription>Relatório de entradas e saídas.</CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                     <Tabs defaultValue="monthly" onValueChange={(value) => {
                                         setCashFlowView(value as any);
                                         setCurrentDate(new Date()); // Reset date on view change
                                     }} className="w-auto">
                                        <TabsList>
                                            <TabsTrigger value="daily">Diário</TabsTrigger>
                                            <TabsTrigger value="monthly">Mensal</TabsTrigger>
                                            <TabsTrigger value="yearly">Anual</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                <span>{formatCashFlowTitle()}</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            {cashFlowView === 'daily' && (
                                                <Calendar
                                                    mode="single"
                                                    selected={currentDate}
                                                    onSelect={handleDateSelect}
                                                    disabled={(date) =>
                                                        date > new Date() || date < startOfMonth(subMonths(new Date(), 1))
                                                    }
                                                    initialFocus
                                                />
                                            )}
                                            {cashFlowView === 'monthly' && (
                                                <Calendar
                                                    mode="single"
                                                    selected={currentDate}
                                                    onSelect={handleDateSelect}
                                                    views={["months", "years"]}
                                                    captionLayout="dropdown-buttons"
                                                    fromDate={subMonths(new Date(), 11)}
                                                    toDate={new Date()}
                                                    locale={ptBR}
                                                />
                                            )}
                                             {cashFlowView === 'yearly' && (
                                                <Calendar
                                                    mode="single"
                                                    selected={currentDate}
                                                    onSelect={handleDateSelect}
                                                    views={["years"]}
                                                    captionLayout="dropdown-buttons"
                                                    fromYear={getYear(subYears(new Date(), 4))}
                                                    toYear={getYear(new Date())}
                                                    locale={ptBR}
                                                />
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base font-medium flex items-center justify-center gap-2 text-green-600">
                                            <TrendingUp className="h-5 w-5" /> Entradas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{cashFlowReport.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                     <CardHeader>
                                        <CardTitle className="text-base font-medium flex items-center justify-center gap-2 text-red-600">
                                            <TrendingDown className="h-5 w-5" /> Saídas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{cashFlowReport.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </CardContent>
                                </Card>
                                 <Card>
                                     <CardHeader>
                                        <CardTitle className="text-base font-medium flex items-center justify-center gap-2 text-blue-600">
                                            <ChevronsUpDown className="h-5 w-5" /> Saldo
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className={cn("text-2xl font-bold", cashFlowReport.balance >= 0 ? "text-green-700" : "text-red-700")}>{cashFlowReport.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </CardContent>
                                </Card>
                           </div>
                           
                           {cashFlowView !== 'daily' && (
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cashFlowReport.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${Number(value)/1000}k`}/>
                                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                    <Legend />
                                    <Bar dataKey="Entradas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Saídas" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                           )}

                           <div>
                               <h4 className="text-lg font-semibold mb-4">Transações do Período</h4>
                               <div className="overflow-x-auto">
                                   <Table>
                                       <TableHeader>
                                           <TableRow>
                                               <TableHead>Data</TableHead>
                                               <TableHead>Descrição</TableHead>
                                               <TableHead>Tipo</TableHead>
                                               <TableHead className="text-right">Valor</TableHead>
                                           </TableRow>
                                       </TableHeader>
                                       <TableBody>
                                            {isLoading ? Array.from({length: 4}).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                                </TableRow>
                                            )) : cashFlowReport.transactions.length > 0 ? cashFlowReport.transactions.map(t => (
                                            <TableRow key={t.id}>
                                                    <TableCell>{format(t.date, 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>{t.description}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={t.type === 'Entrada' ? 'secondary' : 'destructive'} className={t.type === 'Entrada' ? getInvoiceStatusClass('Paga') : getInvoiceStatusClass('Vencida')}>
                                                            {t.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">Nenhuma transação encontrada para este período.</TableCell>
                                            </TableRow>
                                        )}
                                       </TableBody>
                                   </Table>
                               </div>
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    