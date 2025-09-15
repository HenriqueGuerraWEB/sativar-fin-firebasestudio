
"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, BookText, MoreHorizontal, Trash2, Folder, FileText, Shapes, Pencil, Check, ChevronsUpDown, Settings } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKnowledgeBase, KnowledgeBaseArticle } from '@/hooks/use-knowledge-base';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { updateCategory, deleteCategory } from '@/ai/flows/knowledge-base-categories-flow';
import { addExpenseCategory } from '@/ai/flows/expense-categories-flow';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useExpenseCategories } from '@/hooks/use-expense-categories';


export default function KnowledgeBasePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { articles, createArticle, deleteArticle, loading: articlesLoading, refreshArticles } = useKnowledgeBase();
    const { 
        categories: articleCategories, 
        addExpenseCategory: addArticleCategory, 
        updateExpenseCategory: updateArticleCategory,
        deleteExpenseCategory: deleteArticleCategory,
        refreshCategories: refreshArticleCategories,
        isLoading: categoriesLoading 
    } = useExpenseCategories();

    const [isCreateArticleDialogOpen, setIsCreateArticleDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    
    const [newArticleTitle, setNewArticleTitle] = useState("");
    const [newArticleCategory, setNewArticleCategory] = useState("");
    const [isCategoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

    const [categoryForm, setCategoryForm] = useState<{id: string | null, name: string}>({ id: null, name: ''});

    const loading = articlesLoading || categoriesLoading;

    const handleCreateArticle = async () => {
        if (!user || !user.email) {
            toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para criar um artigo.", variant: "destructive" });
            return;
        }
        if (!newArticleTitle.trim()) {
            toast({ title: "Erro", description: "O título do artigo é obrigatório.", variant: "destructive" });
            return;
        }
        try {
            const newArticle = await createArticle({ 
                authorId: user.email, 
                title: newArticleTitle,
                category: newArticleCategory || "Rascunhos" // Default to "Rascunhos" if empty
            });
            toast({ title: "Sucesso!", description: `Artigo "${newArticleTitle}" criado.` });
            router.push(`/knowledge-base/${newArticle.id}`);
        } catch (error) {
            console.error("Error creating article:", error);
            toast({ title: "Erro", description: "Não foi possível criar o artigo.", variant: "destructive" });
        } finally {
            setIsCreateArticleDialogOpen(false);
            setNewArticleTitle("");
            setNewArticleCategory("");
        }
    };
    
    const handleDeleteArticle = async (articleId: string) => {
        try {
            await deleteArticle(articleId);
            toast({ title: "Sucesso", description: "Artigo excluído com sucesso." });
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível excluir o artigo.", variant: "destructive" });
        }
    };

    const groupedArticles = useMemo(() => {
        const groups: { [key: string]: KnowledgeBaseArticle[] } = {};
        articles.forEach(article => {
            const category = article.category || 'Não categorizados';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(article);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [articles]);

    const uniqueCategories = useMemo(() => {
        return articleCategories.map(c => c.name).sort();
    }, [articleCategories]);

    const handleSelectCategoryForEdit = (category: {id: string, name: string}) => {
        setCategoryForm(category);
    }
    
    const resetCategoryForm = () => {
        setCategoryForm({ id: null, name: '' });
    }

    const handleSaveCategory = async () => {
        if (!categoryForm.name.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
            return;
        }

        try {
            if (categoryForm.id) {
                await updateArticleCategory(categoryForm.id, { name: categoryForm.name });
                toast({ title: "Sucesso", description: `Categoria atualizada.` });
            } else {
                 await addArticleCategory({ name: categoryForm.name });
                 toast({ title: "Sucesso", description: `Categoria "${categoryForm.name}" criada.` });
            }
            await refreshArticleCategories();
            resetCategoryForm();
        } catch (error) {
             console.error("Error saving category:", error);
             toast({ title: "Erro", description: "Não foi possível salvar a categoria.", variant: "destructive" });
        }
    };
    
    const handleDeleteCategory = async (categoryId: string) => {
         try {
            await deleteArticleCategory(categoryId);
            toast({ title: "Sucesso", description: "Categoria excluída com sucesso."});
            await refreshArticleCategories();
            resetCategoryForm();
        } catch (error) {
            console.error("Error deleting category:", error);
            toast({ title: "Erro", description: "Não foi possível excluir a categoria.", variant: "destructive" });
        }
    }


    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Base de Conhecimento</h1>
                    <p className="text-muted-foreground">Crie e gerencie tutoriais, documentações e anotações.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isCreateArticleDialogOpen} onOpenChange={setIsCreateArticleDialogOpen}>
                        <DialogTrigger asChild>
                             <Button size="sm" className="gap-1 w-full sm:w-auto" disabled={loading}>
                                <PlusCircle className="h-4 w-4" />
                                Novo Artigo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Criar Novo Artigo</DialogTitle>
                                <DialogDescription>
                                    Forneça um título e uma categoria para o seu novo artigo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="title" className="text-right">
                                        Título
                                    </Label>
                                    <Input
                                        id="title"
                                        value={newArticleTitle}
                                        onChange={(e) => setNewArticleTitle(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Título do Artigo"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                     <Label htmlFor="category" className="text-right">
                                        Categoria
                                    </Label>
                                    <div className="col-span-3">
                                       <Popover open={isCategoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isCategoryPopoverOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {newArticleCategory || "Selecione uma categoria"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command onValueChange={setNewArticleCategory}>
                                                    <CommandInput placeholder="Buscar categoria..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                                        <CommandGroup>
                                                             <CommandItem onSelect={() => {
                                                                setIsCategoryDialogOpen(true);
                                                                setCategoryPopoverOpen(false);
                                                             }}>
                                                                <Shapes className="mr-2 h-4 w-4" />
                                                                Gerenciar Categorias
                                                            </CommandItem>
                                                            {articleCategories.map((category) => (
                                                                <CommandItem
                                                                    key={category.id}
                                                                    value={category.name}
                                                                    onSelect={(currentValue) => {
                                                                        setNewArticleCategory(currentValue === newArticleCategory ? "" : currentValue);
                                                                        setCategoryPopoverOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", newArticleCategory === category.name ? "opacity-100" : "opacity-0")} />
                                                                    {category.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleCreateArticle}>Criar Artigo</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Artigos e Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                     {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                     ) : articles.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-2">
                           {groupedArticles.map(([category, items]) => {
                                const categoryIcon = items.find(item => item.icon)?.icon || null;
                                return (
                                 <AccordionItem value={category} key={category} className="border-b-0">
                                   <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 rounded-lg">
                                     <div className="flex items-center gap-3">
                                       {categoryIcon ? <span className="text-xl">{categoryIcon}</span> : <Folder className="h-5 w-5 text-primary" />}
                                       <span className="font-semibold text-lg">{category}</span>
                                       <span className="text-sm text-muted-foreground">({items.length} artigo{items.length > 1 ? 's' : ''})</span>
                                     </div>
                                   </AccordionTrigger>
                                   <AccordionContent className="border rounded-b-lg">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableBody>
                                                {items.map(article => (
                                                    <TableRow key={article.id} className="border-t">
                                                        <TableCell 
                                                            className="font-medium cursor-pointer hover:underline py-3" 
                                                            onClick={() => router.push(`/knowledge-base/${article.id}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {article.icon ? <span className="text-lg">{article.icon}</span> : <FileText className="h-4 w-4 text-muted-foreground" />}
                                                                <span>{article.title}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell text-muted-foreground w-[200px]">{article.authorId}</TableCell>
                                                        <TableCell className="hidden sm:table-cell text-right text-muted-foreground w-[220px]">{format(new Date(article.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                                                        <TableCell className="text-right w-20">
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
                                                                        <DropdownMenuItem onClick={() => router.push(`/knowledge-base/${article.id}`)}>Editar</DropdownMenuItem>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o artigo.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => handleDeleteArticle(article.id)}>Excluir</AlertDialogAction>
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
                                   </AccordionContent>
                                 </AccordionItem>
                               )
                           })}
                        </Accordion>
                     ) : (
                        <div className="text-center py-16">
                            <BookText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Nenhum artigo encontrado</h3>
                            <p className="mt-2 text-sm text-muted-foreground">Comece a criar sua base de conhecimento.</p>
                             <Dialog open={isCreateArticleDialogOpen} onOpenChange={setIsCreateArticleDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="mt-6">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Criar Primeiro Artigo
                                    </Button>
                                </DialogTrigger>
                               <DialogContent>
                                     <DialogHeader>
                                        <DialogTitle>Criar Novo Artigo</DialogTitle>
                                        <DialogDescription>
                                            Forneça um título e uma categoria para o seu novo artigo.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="title" className="text-right">
                                                Título
                                            </Label>
                                            <Input
                                                id="title"
                                                value={newArticleTitle}
                                                onChange={(e) => setNewArticleTitle(e.target.value)}
                                                className="col-span-3"
                                                placeholder="Título do Artigo"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="category" className="text-right">
                                                Categoria
                                            </Label>
                                            <div className="col-span-3">
                                               <Popover open={isCategoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={isCategoryPopoverOpen}
                                                            className="w-full justify-between"
                                                        >
                                                            {newArticleCategory || "Selecione uma categoria"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0">
                                                        <Command onValueChange={setNewArticleCategory}>
                                                            <CommandInput placeholder="Buscar categoria..." />
                                                            <CommandList>
                                                                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem onSelect={() => {
                                                                        setIsCategoryDialogOpen(true);
                                                                        setCategoryPopoverOpen(false);
                                                                    }}>
                                                                        <Shapes className="mr-2 h-4 w-4" />
                                                                        Gerenciar Categorias
                                                                    </CommandItem>
                                                                    {articleCategories.map((category) => (
                                                                        <CommandItem
                                                                            key={category.id}
                                                                            value={category.name}
                                                                            onSelect={(currentValue) => {
                                                                                setNewArticleCategory(currentValue === newArticleCategory ? "" : currentValue);
                                                                                setCategoryPopoverOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4", newArticleCategory === category.name ? "opacity-100" : "opacity-0")} />
                                                                            {category.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" onClick={handleCreateArticle}>Criar Artigo</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                     )}
                </CardContent>
            </Card>

            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Gerenciar Categorias</DialogTitle>
                        <DialogDescription>
                            Adicione, edite ou exclua as categorias da sua base de conhecimento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                        {/* Coluna da Esquerda: Lista de Categorias */}
                        <div className="flex flex-col gap-4">
                             <h3 className="font-semibold">Categorias Existentes</h3>
                             <div className="border rounded-md max-h-80 overflow-y-auto">
                                {articleCategories.length > 0 ? (
                                    articleCategories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-muted/50">
                                            <span 
                                                className="cursor-pointer flex-1"
                                                onClick={() => handleSelectCategoryForEdit(cat)}
                                            >
                                                {cat.name}
                                            </span>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir a categoria &quot;{cat.name}&quot;?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                           Atenção! Esta ação não pode ser desfeita. As despesas associadas a esta categoria não serão excluídas, mas ficarão sem categoria.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Sim, Excluir</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ))
                                ) : (
                                    <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
                                )}
                             </div>
                        </div>
                        {/* Coluna da Direita: Formulário */}
                        <div className="flex flex-col gap-4">
                             <h3 className="font-semibold">{categoryForm.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</h3>
                             <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                                <div className="space-y-2">
                                     <Label htmlFor="category-name">Nome da Categoria</Label>
                                     <Input 
                                        id="category-name"
                                        placeholder="Ex: Tutoriais"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                     />
                                </div>
                                <div className="flex justify-end gap-2">
                                    {categoryForm.id && (
                                        <Button variant="outline" onClick={resetCategoryForm}>Cancelar Edição</Button>
                                    )}
                                    <Button onClick={handleSaveCategory}>
                                        {categoryForm.id ? 'Salvar Alterações' : 'Adicionar Categoria'}
                                    </Button>
                                </div>
                             </div>
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

    