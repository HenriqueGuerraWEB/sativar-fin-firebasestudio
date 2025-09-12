"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useExpenseCategories, ExpenseCategory } from '@/hooks/use-expense-categories';


const emptyCategory: Omit<ExpenseCategory, 'id'> = {
    name: "",
};

export default function ExpenseCategoriesPage() {
    const { toast } = useToast();
    const { categories, isLoading, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } = useExpenseCategories();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Omit<ExpenseCategory, 'id'> | ExpenseCategory>(emptyCategory);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setCurrentCategory(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveCategory = async () => {
        if (!currentCategory.name) {
            toast({
                title: "Erro de Validação",
                description: "O nome da categoria é obrigatório.",
                variant: "destructive",
            });
            return;
        }

        try {
            if ('id' in currentCategory) {
                await updateExpenseCategory(currentCategory.id, { name: currentCategory.name });
            } else {
                await addExpenseCategory({ name: currentCategory.name });
            }
            toast({ title: "Sucesso", description: `Categoria ${'id' in currentCategory ? 'atualizada' : 'adicionada'} com sucesso.` });
            setIsSheetOpen(false);
            setCurrentCategory(emptyCategory);
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível salvar a categoria.", variant: "destructive" });
        }
    };

    const handleAddNew = () => {
        setCurrentCategory(emptyCategory);
        setIsSheetOpen(true);
    };

    const handleEdit = (category: ExpenseCategory) => {
        setCurrentCategory(category);
        setIsSheetOpen(true);
    };

    const handleDelete = async (categoryId: string) => {
       try {
         await deleteExpenseCategory(categoryId);
         toast({ title: "Sucesso", description: "Categoria excluída com sucesso." });
       } catch (error) {
         toast({ title: "Erro", description: "Não foi possível excluir a categoria.", variant: "destructive" });
       }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorias de Despesas</h1>
                    <p className="text-muted-foreground">Gerencie as categorias para suas despesas.</p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={(isOpen) => {
                    setIsSheetOpen(isOpen)
                    if (!isOpen) setCurrentCategory(emptyCategory);
                }}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleAddNew}>
                            <PlusCircle className="h-4 w-4" />
                            Nova Categoria
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>{'id' in currentCategory ? 'Editar Categoria' : 'Criar nova categoria'}</SheetTitle>
                            <SheetDescription>
                                Defina o nome para a categoria de despesa.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nome</Label>
                                <Input id="name" value={currentCategory.name} onChange={handleInputChange} className="col-span-3" />
                            </div>
                        </div>
                        <SheetFooter>
                            <Button onClick={handleSaveCategory}>Salvar Categoria</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead><span className="sr-only">Ações</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                    ))
                                ) : categories.map(category => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => handleEdit(category)}>Editar</DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente a categoria.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(category.id)}>Excluir</AlertDialogAction>
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
        </div>
    );
}
