"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";

const chartData = [
  { month: "Fev", revenue: 18600, expenses: 8000 },
  { month: "Mar", revenue: 20500, expenses: 9500 },
  { month: "Abr", revenue: 23900, expenses: 11200 },
  { month: "Mai", revenue: 19800, expenses: 10100 },
  { month: "Jun", revenue: 25400, expenses: 12300 },
  { month: "Jul", revenue: 29000, expenses: 13000 },
];

const chartConfig = {
  revenue: { label: "Receita", color: "hsl(var(--chart-1))" },
  expenses: { label: "Despesas", color: "hsl(var(--chart-2))" },
};

const invoices = [
    { client: "Inovatech Soluções", dueDate: "Hoje", amount: "R$ 2.500,00", status: "A vencer" },
    { client: "Global-Trade Inc.", dueDate: "Hoje", amount: "R$ 4.800,00", status: "A vencer" },
    { client: "Quantum Dynamics", dueDate: "Vencida (3 dias)", amount: "R$ 1.200,00", status: "Vencida" },
    { client: "Nexus-Enterprises", dueDate: "Vencida (7 dias)", amount: "R$ 3.000,00", status: "Vencida" },
];


export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 29.000,00</div>
            <p className="text-xs text-muted-foreground">+15.2% em relação ao mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">+2 novos este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 13.000,00</div>
            <p className="text-xs text-muted-foreground">+8% em relação ao mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Previsto</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 16.000,00</div>
            <p className="text-xs text-muted-foreground">Saldo em conta: R$ 54.320,10</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita vs. Despesas</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        <Card>
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
                    {invoices.map((invoice) => (
                        <TableRow key={invoice.client}>
                            <TableCell className="font-medium">{invoice.client}</TableCell>
                            <TableCell>
                                <Badge variant={invoice.status === 'Vencida' ? 'destructive' : 'secondary'}>{invoice.dueDate}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{invoice.amount}</TableCell>
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
