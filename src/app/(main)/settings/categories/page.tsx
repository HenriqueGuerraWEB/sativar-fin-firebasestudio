
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES_STORAGE_KEY = 'sativar-expenseCategories';

type Category = {
    id: string;
    name: string;
};

const emptyCategory: Omit<Category, 'id'> = {
    name: "",
};

export default function ExpenseCategoriesPage() {
    const { toast } = useToast();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Omit<Category, 'id'> | Category>(emptyCategory);

    const getCategoriesFromStorage = useCallback((): Category[] => {
        try {
            const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
            return storedCategories ? JSON.parse(storedCategories) : [];
        } catch (error) {
            console.error("Error reading categories from localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível ler as categorias.", variant: "destructive" });
            return [];
        }
    }, [toast]);
    
    const setCategoriesToStorage = useCallback((categories: Category[]) => {
        try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
        } catch (error) {
            console.error("Error writing categories to localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as categorias.", variant: "destructive" });
        }
    }, [toast]);

    useEffect(() => {
        setIsLoading(true);
        const storedCategories = getCategoriesFromStorage();
        setCategories(storedCategories.sort((a, b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
    }, [getCategoriesFromStorage]);

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

        const currentCategories = getCategoriesFromStorage();
        let updatedCategories;

        if ('id' in currentCategory) {
            updatedCategories = currentCategories.map(cat => 
                cat.id === currentCategory.id ? { ...cat, name: currentCategory.name } : cat
            );
        } else {
            const newCategory: Category = { id: crypto.randomUUID(), name: currentCategory.name };
            updatedCategories = [...currentCategories, newCategory];
        }

        updatedCategories.sort((a, b) => a.name.localeCompare(b.name));
        setCategoriesToStorage(updatedCategories);
        setCategories(updatedCategories);

        toast({ title: "Sucesso", description: `Categoria ${'id' in currentCategory ? 'atualizada' : 'adicionada'} com sucesso.` });
        setIsSheetOpen(false);
        setCurrentCategory(emptyCategory);
    };

    const handleAddNew = () => {
        setCurrentCategory(emptyCategory);
        setIsSheetOpen(true);
    };

    const handleEdit = (category: Category) => {
        setCurrentCategory(category);
        setIsSheetOpen(true);
    };

    const handleDelete = async (categoryId: string) => {
        const currentCategories = getCategoriesFromStorage();
        const updatedCategories = currentCategories.filter(cat => cat.id !== categoryId);
        setCategoriesToStorage(updatedCategories);
        setCategories(updatedCategories);
        toast({ title: "Sucesso", description: "Categoria excluída com sucesso." });
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
