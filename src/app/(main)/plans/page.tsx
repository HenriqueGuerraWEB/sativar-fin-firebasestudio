
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Plan = {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'recurring' | 'one-time';
    recurrenceValue?: number;
    recurrencePeriod?: 'dias' | 'meses' | 'anos';
};

const emptyPlan: Omit<Plan, 'id'> = {
    name: "",
    description: "",
    price: 0,
    type: 'recurring',
    recurrenceValue: 1,
    recurrencePeriod: 'meses',
};

export default function PlansPage() {
    const { toast } = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Omit<Plan, 'id'> | Plan>(emptyPlan);

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "plans"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const plansData: Plan[] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Plan));
            setPlans(plansData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching plans: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os planos.",
                variant: "destructive",
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        const numValue = id === 'price' || id === 'recurrenceValue' ? parseFloat(value) : 0;
        
        setCurrentPlan(prev => ({ 
            ...prev, 
            [id]: id === 'price' || id === 'recurrenceValue' ? (isNaN(numValue) ? 0 : numValue) : value 
        }));
    };
    
    const handleSelectChange = (id: 'type' | 'recurrencePeriod', value: string) => {
        setCurrentPlan(prev => ({...prev, [id]: value}));
    }

    const handleSavePlan = async () => {
        if (!currentPlan.name || currentPlan.price <= 0) {
            toast({
                title: "Erro de Validação",
                description: "Nome e Preço (maior que zero) são campos obrigatórios.",
                variant: "destructive",
            });
            return;
        }

        try {
            const planData: Partial<Plan> = {
                ...currentPlan,
            };

            if (planData.type === 'one-time') {
                delete planData.recurrenceValue;
                delete planData.recurrencePeriod;
            } else {
                 planData.recurrenceValue = planData.recurrenceValue || 1;
                 planData.recurrencePeriod = planData.recurrencePeriod || 'meses';
            }


            if ('id' in currentPlan) {
                const planRef = doc(db, "plans", currentPlan.id);
                const { id, ...data } = planData;
                await updateDoc(planRef, data);
                toast({ title: "Sucesso", description: "Plano atualizado com sucesso." });
            } else {
                await addDoc(collection(db, "plans"), planData);
                toast({ title: "Sucesso", description: "Plano adicionado com sucesso." });
            }
            setIsSheetOpen(false);
            setCurrentPlan(emptyPlan);
        } catch (error) {
            console.error("Error saving plan: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar o plano.",
                variant: "destructive",
            });
        }
    };

    const handleAddNew = () => {
        setCurrentPlan(emptyPlan);
        setIsSheetOpen(true);
    };

    const handleEdit = (plan: Plan) => {
        setCurrentPlan(plan);
        setIsSheetOpen(true);
    };

    const handleDelete = async (planId: string) => {
        try {
            await deleteDoc(doc(db, "plans", planId));
            toast({ title: "Sucesso", description: "Plano excluído com sucesso." });
        } catch (error) {
            console.error("Error deleting plan: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir o plano.",
                variant: "destructive",
            });
        }
    };
    
    const formatRecurrence = (plan: Plan) => {
        if (plan.type === 'one-time') return 'Pagamento Único';
        if (!plan.recurrenceValue || !plan.recurrencePeriod) return 'N/A';
        const period = plan.recurrenceValue === 1 
            ? plan.recurrencePeriod.slice(0, -1) 
            : plan.recurrencePeriod;
        return `A cada ${plan.recurrenceValue} ${period}`;
    }


    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planos de Serviço</h1>
                    <p className="text-muted-foreground">Gerencie seus planos de serviço, recorrentes ou de pagamento único.</p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={(isOpen) => {
                    setIsSheetOpen(isOpen);
                    if (!isOpen) setCurrentPlan(emptyPlan);
                }}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1" onClick={handleAddNew}>
                            <PlusCircle className="h-4 w-4" />
                            Novo Plano
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>{'id' in currentPlan ? 'Editar Plano' : 'Criar novo plano'}</SheetTitle>
                            <SheetDescription>
                                Defina os detalhes do novo plano de serviço.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input id="name" value={currentPlan.name} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" value={currentPlan.description} onChange={handleInputChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Preço (R$)</Label>
                                    <Input id="price" type="number" value={currentPlan.price} onChange={handleInputChange}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo</Label>
                                    <Select value={currentPlan.type} onValueChange={(value) => handleSelectChange('type', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tipo de cobrança" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="recurring">Recorrente</SelectItem>
                                            <SelectItem value="one-time">Único</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                           
                            {currentPlan.type === 'recurring' && (
                                <div className="p-4 border rounded-lg space-y-4">
                                     <Label className="font-semibold">Configuração de Recorrência</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input id="recurrenceValue" type="number" placeholder="Ex: 1" value={currentPlan.recurrenceValue} onChange={handleInputChange} min="1" />
                                        <Select value={currentPlan.recurrencePeriod} onValueChange={(value) => handleSelectChange('recurrencePeriod', value as any)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Período" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="dias">Dias</SelectItem>
                                                <SelectItem value="meses">Meses</SelectItem>
                                                <SelectItem value="anos">Anos</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                        </div>
                        <SheetFooter>
                            <Button onClick={handleSavePlan}>Salvar Plano</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Planos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plano</TableHead>
                                <TableHead>Cobrança</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="mt-2 h-4 w-48" />
                                    </TableCell>
                                     <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                                ))
                            ) : plans.map(plan => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">
                                        <div>{plan.name}</div>
                                        <div className="text-sm text-muted-foreground">{plan.description}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={plan.type === 'recurring' ? 'secondary' : 'outline'}>{formatRecurrence(plan)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
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
                                                    <DropdownMenuItem onClick={() => handleEdit(plan)}>Editar</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o plano.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(plan.id)}>Excluir</AlertDialogAction>
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
        </div>
    );
}
