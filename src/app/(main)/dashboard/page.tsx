
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp, getDocs } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Client = {
    id: string;
    status: "Ativo" | "Inativo";
    createdAt: Timestamp; // Assuming clients have a creation date
};

type Invoice = {
    id: string;
    clientName: string;
    dueDate: Timestamp;
    amount: number;
    status: 'Paga' | 'Pendente' | 'Vencida';
};

type Expense = {
    id: string;
    amount: number;
    dueDate: Timestamp;
    status: 'Paga' | 'Pendente';
};

const chartConfig = {
  revenue: { label: "Receita", color: "hsl(var(--chart-1))" },
  expenses: { label: "Despesas", color: "hsl(var(--chart-2))" },
};

export default function DashboardPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const clientsQuery = query(collection(db, "clients"));
                const invoicesQuery = query(collection(db, "invoices"));
                const expensesQuery = query(collection(db, "expenses"));

                const [clientsSnapshot, invoicesSnapshot, expensesSnapshot] = await Promise.all([
                    getDocs(clientsQuery),
                    getDocs(invoicesQuery),
                    getDocs(expensesQuery)
                ]);

                setClients(clientsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
                setInvoices(invoicesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
                setExpenses(expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Set up real-time listeners after initial fast load
        const unsubClients = onSnapshot(query(collection(db, "clients")), (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
        });
        const unsubInvoices = onSnapshot(query(collection(db, "invoices")), (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
        });
        const unsubExpenses = onSnapshot(query(collection(db, "expenses")), (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
        });


        return () => {
            unsubClients();
            unsubInvoices();
            unsubExpenses();
        };
    }, []);

    const activeClientsCount = useMemo(() => clients.filter(c => c.status === 'Ativo').length, [clients]);
    
    const newClientsThisMonth = useMemo(() => {
       const now = new Date();
       const start = startOfMonth(now);
       const end = endOfMonth(now);
       return clients.filter(c => {
         if (!c.createdAt) return false;
         const createdAtDate = c.createdAt.toDate();
         return isWithinInterval(createdAtDate, { start, end });
       }).length;
    }, [clients]);

    const { monthlyRevenue, revenueChange, monthlyExpenses, expenseChange, expectedProfit, accountBalance } = useMemo(() => {
        const now = new Date();
        const currentMonth = getMonth(now);
        const currentYear = getYear(now);
        const lastMonthDate = subMonths(now, 1);
        const lastMonth = getMonth(lastMonthDate);
        const lastMonthYear = getYear(lastMonthDate);

        const paidInvoicesThisMonth = invoices.filter(inv => {
            if (inv.status !== 'Paga' || !inv.dueDate) return false;
            const dueDate = inv.dueDate.toDate();
            return getMonth(dueDate) === currentMonth && getYear(dueDate) === currentYear;
        });
        const monthlyRevenue = paidInvoicesThisMonth.reduce((sum, inv) => sum + inv.amount, 0);

        const paidInvoicesLastMonth = invoices.filter(inv => {
            if (inv.status !== 'Paga' || !inv.dueDate) return false;
            const dueDate = inv.dueDate.toDate();
            return getMonth(dueDate) === lastMonth && getYear(dueDate) === lastMonthYear;
        });
        const lastMonthRevenue = paidInvoicesLastMonth.reduce((sum, inv) => sum + inv.amount, 0);
        const revenueChange = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : monthlyRevenue > 0 ? 100 : 0;

        const paidExpensesThisMonth = expenses.filter(exp => {
            if (exp.status !== 'Paga' || !exp.dueDate) return false;
            const dueDate = exp.dueDate.toDate();
            return getMonth(dueDate) === currentMonth && getYear(dueDate) === currentYear;
        });
        const monthlyExpenses = paidExpensesThisMonth.reduce((sum, exp) => sum + exp.amount, 0);
        
        const paidExpensesLastMonth = expenses.filter(exp => {
            if (exp.status !== 'Paga' || !exp.dueDate) return false;
            const dueDate = exp.dueDate.toDate();
            return getMonth(dueDate) === lastMonth && getYear(dueDate) === lastMonthYear;
        });
        const lastMonthExpenses = paidExpensesLastMonth.reduce((sum, exp) => sum + exp.amount, 0);

        const expenseChange = lastMonthExpenses > 0 ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : monthlyExpenses > 0 ? 100 : 0;

        const expectedProfit = monthlyRevenue - monthlyExpenses;
        
        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paga')
            .reduce((sum, inv) => sum + inv.amount, 0);
        const totalExpenses = expenses
            .filter(exp => exp.status === 'Paga')
            .reduce((sum, exp) => sum + exp.amount, 0);
        const accountBalance = totalRevenue - totalExpenses;

        return { monthlyRevenue, revenueChange, monthlyExpenses, expenseChange, expectedProfit, accountBalance };

    }, [invoices, expenses]);

    const chartData = useMemo(() => {
        const data = Array.from({ length: 6 }).map((_, i) => {
            const date = subMonths(new Date(), 5 - i);
            return {
                month: format(date, 'MMM', { locale: ptBR }),
                year: getYear(date),
                revenue: 0,
                expenses: 0,
            };
        });

        invoices.forEach(invoice => {
            if (invoice.status === 'Paga') {
                const date = invoice.dueDate.toDate();
                const monthStr = format(date, 'MMM', { locale: ptBR });
                const year = getYear(date);
                const entry = data.find(d => d.month === monthStr && d.year === year);
                if (entry) {
                    entry.revenue += invoice.amount;
                }
            }
        });

        expenses.forEach(expense => {
            if (expense.status === 'Paga') {
                const date = expense.dueDate.toDate();
                const monthStr = format(date, 'MMM', { locale: ptBR });
                const year = getYear(date);
                const entry = data.find(d => d.month === monthStr && d.year === year);
                if (entry) {
                    entry.expenses += expense.amount;
                }
            }
        });

        return data;
    }, [invoices, expenses]);

    const importantNotices = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dueToday = invoices.filter(inv => {
            const dueDate = inv.dueDate.toDate();
            return inv.status === 'Pendente' && dueDate >= today && dueDate < tomorrow;
        }).map(inv => ({...inv, friendlyDueDate: "Hoje" }));

        const overdue = invoices.filter(inv => inv.status === 'Vencida').map(inv => {
             const diffTime = Math.abs(today.getTime() - inv.dueDate.toDate().getTime());
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             return {...inv, friendlyDueDate: `Vencida (${diffDays} dias)`};
        });
        
        return [...dueToday, ...overdue].sort((a,b) => a.dueDate.toMillis() - b.dueDate.toMillis()).slice(0, 4);

    }, [invoices]);


  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio.</p>
        </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
            {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}% em relação ao mês passado</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeClientsCount}</div>}
             {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">+{newClientsThisMonth} novos este mês</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{monthlyExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
            {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">{expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}% em relação ao mês passado</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro do Mês</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{expectedProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
             {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Saldo em conta: {accountBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Receita vs. Despesas</CardTitle>
            <CardDescription>Últimos 6 meses (valores pagos)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
                </BarChart>
            </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Avisos Importantes</CardTitle>
            <CardDescription>Faturas vencendo hoje e vencidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        </TableRow>
                    )) : importantNotices.map((invoice) => (
                        <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.clientName}</TableCell>
                            <TableCell>
                                <Badge variant={invoice.status === 'Vencida' ? 'destructive' : 'secondary'}>{invoice.friendlyDueDate}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    