
"use client"

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval, isToday, isPast, differenceInDays, addDays, isFuture, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { useInvoices } from '@/hooks/use-invoices';
import { useExpenses } from '@/hooks/use-expenses';


const chartConfig = {
  revenue: { label: "Receita", color: "hsl(var(--chart-1))" },
  expenses: { label: "Despesas", color: "hsl(var(--chart-2))" },
};

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { clients, isLoading: clientsLoading } = useClients();
    const { invoices, isLoading: invoicesLoading } = useInvoices();
    const { expenses, isLoading: expensesLoading } = useExpenses();
    
    const isLoading = authLoading || clientsLoading || invoicesLoading || expensesLoading;

    const activeClientsCount = useMemo(() => clients.filter(c => c.status === 'Ativo').length, [clients]);
    
    const newClientsThisMonth = useMemo(() => {
       const now = new Date();
       const start = startOfMonth(now);
       const end = endOfMonth(now);
       return clients.filter(c => {
         if (!c.createdAt) return false;
         const createdAtDate = new Date(c.createdAt); // Convert string to Date
         return isWithinInterval(createdAtDate, { start, end });
       }).length;
    }, [clients]);

    const { monthlyRevenue, revenueChange, monthlyExpenses, expenseChange, expectedProfit, accountBalance } = useMemo(() => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const prevMonthStart = startOfMonth(subMonths(now, 1));
        const prevMonthEnd = endOfMonth(subMonths(now, 1));

        // Current Month Calculations
        const currentMonthPaidInvoices = invoices.filter(inv => 
            inv.status === 'Paga' && inv.paymentDate && isWithinInterval(new Date(inv.paymentDate), { start: currentMonthStart, end: currentMonthEnd })
        );
        const currentMonthRevenue = currentMonthPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        const currentMonthPaidExpenses = expenses.filter(exp => 
            exp.status === 'Paga' && isWithinInterval(new Date(exp.dueDate), { start: currentMonthStart, end: currentMonthEnd })
        );
        const currentMonthExpenses = currentMonthPaidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Previous Month Calculations
        const prevMonthPaidInvoices = invoices.filter(inv => 
            inv.status === 'Paga' && inv.paymentDate && isWithinInterval(new Date(inv.paymentDate), { start: prevMonthStart, end: prevMonthEnd })
        );
        const prevMonthRevenue = prevMonthPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        const prevMonthPaidExpenses = expenses.filter(exp => 
            exp.status === 'Paga' && isWithinInterval(new Date(exp.dueDate), { start: prevMonthStart, end: prevMonthEnd })
        );
        const prevMonthExpenses = prevMonthPaidExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Calculate percentage change
        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const revenueChange = calcChange(currentMonthRevenue, prevMonthRevenue);
        const expenseChange = calcChange(currentMonthExpenses, prevMonthExpenses);

        const profit = currentMonthRevenue - currentMonthExpenses;

        return {
            monthlyRevenue: currentMonthRevenue,
            revenueChange,
            monthlyExpenses: currentMonthExpenses,
            expenseChange,
            expectedProfit: profit,
            accountBalance: profit, // Simplified: account balance is this month's profit
        };
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

        invoices.forEach(inv => {
            if (inv.status === 'Paga' && inv.paymentDate) {
                const paymentDate = new Date(inv.paymentDate);
                const monthIndex = data.findIndex(d => d.month === format(paymentDate, 'MMM', { locale: ptBR }) && d.year === getYear(paymentDate));
                if (monthIndex !== -1) {
                    data[monthIndex].revenue += inv.amount;
                }
            }
        });

        expenses.forEach(exp => {
            if (exp.status === 'Paga') {
                const dueDate = new Date(exp.dueDate);
                const monthIndex = data.findIndex(d => d.month === format(dueDate, 'MMM', { locale: ptBR }) && d.year === getYear(dueDate));
                if (monthIndex !== -1) {
                    data[monthIndex].expenses += exp.amount;
                }
            }
        });
        return data;
    }, [invoices, expenses]);

    const importantNotices = useMemo(() => {
        const today = startOfDay(new Date());
        const upcomingLimit = addDays(today, 5);

        return invoices
            .filter(inv => {
                if (inv.status === 'Paga') return false;
                const dueDate = startOfDay(new Date(inv.dueDate));
                return isPast(dueDate) || isWithinInterval(dueDate, { start: today, end: upcomingLimit });
            })
            .map(inv => {
                const dueDate = startOfDay(new Date(inv.dueDate));
                let friendlyDueDate: string;
                let badgeVariant: 'destructive' | 'warning' | 'default' = 'default';

                if (isToday(dueDate)) {
                    friendlyDueDate = "Vence Hoje";
                    badgeVariant = 'warning';
                } else if (isPast(dueDate)) {
                    const daysOverdue = differenceInDays(today, dueDate);
                    friendlyDueDate = `Vencida há ${daysOverdue} dia(s)`;
                    badgeVariant = 'destructive';
                } else { // isFuture(dueDate)
                     const daysUntilDue = differenceInDays(dueDate, today);
                     friendlyDueDate = `Vence em ${daysUntilDue} dia(s)`;
                     badgeVariant = 'warning';
                }
                
                return { ...inv, friendlyDueDate, badgeVariant };
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
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
            <CardDescription>Faturas vencidas ou com vencimento nos próximos 5 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Aviso</TableHead>
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
                        )) : importantNotices.length > 0 ? importantNotices.map((invoice: any) => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.clientName}</TableCell>
                                <TableCell>
                                    <Badge variant={invoice.badgeVariant === 'destructive' ? 'destructive' : invoice.badgeVariant === 'warning' ? 'secondary' : 'default'}>
                                        {invoice.friendlyDueDate}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">Nenhum aviso importante.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

  

    

    