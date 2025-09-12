
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { Timestamp } from "firebase/firestore";


// Mocks since data is now in localStorage. This can be built out later.
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
    const { user, loading: authLoading } = useAuth();
    const { clients, isLoading: clientsLoading } = useClients();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    
    const isLoading = authLoading || clientsLoading;

    useEffect(() => {
        // In a real scenario, you'd fetch this from localStorage or a new backend
        // For now, we'll use mock data.
        setInvoices([]);
        setExpenses([]);
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
        // This is now mock data
        return {
            monthlyRevenue: 0,
            revenueChange: 0,
            monthlyExpenses: 0,
            expenseChange: 0,
            expectedProfit: 0,
            accountBalance: 0
        };
    }, []);

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
        return data;
    }, []);

    const importantNotices = useMemo(() => {
       return [];
    }, []);


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
            <div className="overflow-x-auto">
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
                        )) : importantNotices.length > 0 ? importantNotices.map((invoice: any) => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.clientName}</TableCell>
                                <TableCell>
                                    <Badge variant={invoice.status === 'Vencida' ? 'destructive' : 'secondary'}>{invoice.friendlyDueDate}</Badge>
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
