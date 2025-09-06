
"use client";

import React, { useState, useEffect } from 'react';
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
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

type Category = {
    id: string;
    name: string;
};

const emptyCategory: Omit<Category, 'id'> = {
    name: "",
};

export default function ExpenseCategoriesPage() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Omit<Category, 'id'> | Category>(emptyCategory);

    useEffect(() => {
        if(authLoading) {
            setIsLoading(true);
            return;
        }

        const fetchInitialData = async () => {
             try {
                const categoriesQuery = query(collection(db, "expenseCategories"), orderBy("name"));
                const categoriesSnapshot = await getDocs(categoriesQuery);
                setCategories(categoriesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category)));
             } catch (error) {
                console.error("Error fetching initial categories: ", error);
                toast({ title: "Erro", description: "Não foi possível carregar as categorias.", variant: "destructive" });
             } finally {
                setIsLoading(false);
             }
        }

        fetchInitialData();

        const q = query(collection(db, "expenseCategories"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const categoriesData: Category[] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
            setCategories(categoriesData);
            if(isLoading) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching categories: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar as categorias em tempo real.",
                variant: "destructive",
            });
        });

        return () => unsubscribe();
    }, [authLoading, toast]);

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
                const categoryRef = doc(db, "expenseCategories", currentCategory.id);
                const { id, ...data } = currentCategory;
                await updateDoc(categoryRef, data);
                toast({ title: "Sucesso", description: "Categoria atualizada com sucesso." });
            } else {
                await addDoc(collection(db, "expenseCategories"), currentCategory);
                toast({ title: "Sucesso", description: "Categoria adicionada com sucesso." });
            }
            setIsSheetOpen(false);
            setCurrentCategory(emptyCategory);
        } catch (error) {
            console.error("Error saving category: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar a categoria.",
                variant: "destructive",
            });
        }
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
        try {
            await deleteDoc(doc(db, "expenseCategories", categoryId));
            toast({ title: "Sucesso", description: "Categoria excluída com sucesso." });
        } catch (error) {
            console.error("Error deleting category: ", error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir a categoria.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorias de Despesas</h1>
                    <p className="text-muted-foreground">Gerencie as categorias para suas despesas.</p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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

    