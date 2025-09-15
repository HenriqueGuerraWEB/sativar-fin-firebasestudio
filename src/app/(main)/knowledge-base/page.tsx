
"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, BookText, MoreHorizontal, Trash2, Folder, FileText, Shapes, Pencil, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKnowledgeBase, KnowledgeBaseArticle } from '@/hooks/use-knowledge-base';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { updateCategory, deleteCategory } from '@/ai/flows/knowledge-base-categories-flow';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


export default function KnowledgeBasePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { articles, createArticle, deleteArticle, loading, refreshArticles } = useKnowledgeBase();
    
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
    const [newArticleTitle, setNewArticleTitle] = useState("");
    const [newArticleCategory, setNewArticleCategory] = useState("");
    const [isCategoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
    
    const [currentCategory, setCurrentCategory] = useState('');
    const [originalCategoryName, setOriginalCategoryName] = useState('');

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
            setIsCreateDialogOpen(false);
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
        const categorySet = new Set(articles.map(a => a.category).filter(Boolean) as string[]);
        return Array.from(categorySet).sort();
    }, [articles]);

    const handleOpenCategorySheet = (mode: 'add' | 'edit', categoryName = '') => {
        setSheetMode(mode);
        setCurrentCategory(categoryName);
        if (mode === 'edit') {
            setOriginalCategoryName(categoryName);
        }
        setIsCategorySheetOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!currentCategory.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
            return;
        }

        try {
            if (sheetMode === 'edit') {
                await updateCategory({ oldName: originalCategoryName, newName: currentCategory });
                toast({ title: "Sucesso", description: `Categoria "${originalCategoryName}" renomeada para "${currentCategory}".` });
            }
            // Add mode is handled implicitly by creating an article with the new category
            await refreshArticles();
            setIsCategorySheetOpen(false);
        } catch (error) {
            console.error("Error saving category:", error);
            toast({ title: "Erro", description: "Não foi possível salvar a categoria.", variant: "destructive" });
        }
    };

    const handleDeleteCategory = async (categoryName: string) => {
        try {
            await deleteCategory(categoryName);
            toast({ title: "Sucesso", description: `Categoria "${categoryName}" e todos os seus artigos foram excluídos.` });
            await refreshArticles();
        } catch(error) {
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
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                                                    {newArticleCategory || "Selecione ou crie uma..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command onValueChange={setNewArticleCategory}>
                                                    <CommandInput placeholder="Buscar ou criar categoria..." />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                             <Button 
                                                                variant="ghost" 
                                                                className="w-full text-left justify-start"
                                                                onClick={() => {
                                                                    const input = document.querySelector<HTMLInputElement>('[cmdk-input]');
                                                                    if (input) setNewArticleCategory(input.value);
                                                                    setCategoryPopoverOpen(false);
                                                                }}
                                                            >
                                                                <PlusCircle className="mr-2 h-4 w-4" /> Criar nova categoria
                                                            </Button>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueCategories.map((category) => (
                                                                <CommandItem
                                                                    key={category}
                                                                    value={category}
                                                                    onSelect={(currentValue) => {
                                                                        setNewArticleCategory(currentValue === newArticleCategory ? "" : currentValue);
                                                                        setCategoryPopoverOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", newArticleCategory === category ? "opacity-100" : "opacity-0")} />
                                                                    {category}
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

                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto">
                                <Shapes className="h-4 w-4" />
                                Categorias
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Gerenciar Categorias</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {uniqueCategories.map(category => (
                                <DropdownMenuSub key={category}>
                                    <DropdownMenuSubTrigger>{category}</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleOpenCategorySheet('edit', category)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Renomear
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                             <AlertDialogTrigger asChild>
                                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </DropdownMenuItem>
                                             </AlertDialogTrigger>
                                             <AlertDialogContent>
                                                 <AlertDialogHeader>
                                                     <AlertDialogTitle>Excluir a categoria &quot;{category}&quot;?</AlertDialogTitle>
                                                     <AlertDialogDescription>
                                                         Atenção! Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria e **todos os artigos dentro dela**.
                                                     </AlertDialogDescription>
                                                 </AlertDialogHeader>
                                                 <AlertDialogFooter>
                                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                     <AlertDialogAction onClick={() => handleDeleteCategory(category)}>Sim, Excluir Tudo</AlertDialogAction>
                                                 </AlertDialogFooter>
                                             </AlertDialogContent>
                                         </AlertDialog>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            ))}
                            {uniqueCategories.length === 0 && (
                                <DropdownMenuItem disabled>Nenhuma categoria encontrada</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Artigos e Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                     {loading && articles.length === 0 ? (
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
                                 <AccordionItem value={category} key={category} className="border rounded-lg">
                                   <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                                     <div className="flex items-center gap-3">
                                       {categoryIcon ? <span className="text-xl">{categoryIcon}</span> : <Folder className="h-5 w-5 text-primary" />}
                                       <span className="font-semibold text-lg">{category}</span>
                                       <span className="text-sm text-muted-foreground">({items.length} artigo{items.length > 1 ? 's' : ''})</span>
                                     </div>
                                   </AccordionTrigger>
                                   <AccordionContent>
                                    <div className="overflow-x-auto border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Título</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Autor</TableHead>
                                                    <TableHead className="hidden sm:table-cell text-right">Última Atualização</TableHead>
                                                    <TableHead className="text-right">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map(article => (
                                                    <TableRow key={article.id}>
                                                        <TableCell 
                                                            className="font-medium cursor-pointer hover:underline" 
                                                            onClick={() => router.push(`/knowledge-base/${article.id}`)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {article.icon ? <span className="text-lg">{article.icon}</span> : <FileText className="h-4 w-4 text-muted-foreground" />}
                                                                <span>{article.title}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell text-muted-foreground">{article.authorId}</TableCell>
                                                        <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{format(new Date(article.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                                                        <TableCell className="text-right">
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
                             <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                                                            {newArticleCategory || "Selecione ou crie uma..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0">
                                                        <Command onValueChange={setNewArticleCategory}>
                                                            <CommandInput placeholder="Buscar ou criar categoria..." />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        className="w-full text-left justify-start"
                                                                        onClick={() => {
                                                                            const input = document.querySelector<HTMLInputElement>('[cmdk-input]');
                                                                            if (input) setNewArticleCategory(input.value);
                                                                            setCategoryPopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <PlusCircle className="mr-2 h-4 w-4" /> Criar nova categoria
                                                                    </Button>
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {uniqueCategories.map((category) => (
                                                                        <CommandItem
                                                                            key={category}
                                                                            value={category}
                                                                            onSelect={(currentValue) => {
                                                                                setNewArticleCategory(currentValue === newArticleCategory ? "" : currentValue);
                                                                                setCategoryPopoverOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4", newArticleCategory === category ? "opacity-100" : "opacity-0")} />
                                                                            {category}
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
        </div>
    );
}

    