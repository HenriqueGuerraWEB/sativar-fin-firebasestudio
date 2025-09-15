
"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, BookText, MoreHorizontal, Trash2, Folder, FileText, Shapes, Pencil } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKnowledgeBase, KnowledgeBaseArticle } from '@/hooks/use-knowledge-base';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { updateCategory, deleteCategory } from '@/ai/flows/knowledge-base-categories-flow';


export default function KnowledgeBasePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { articles, createArticle, deleteArticle, loading, refreshArticles } = useKnowledgeBase();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
    const [currentCategory, setCurrentCategory] = useState('');
    const [originalCategoryName, setOriginalCategoryName] = useState('');

    const handleCreateArticle = async () => {
        if (!user || !user.email) {
            toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para criar um artigo.", variant: "destructive" });
            return;
        }
        try {
            const newArticle = await createArticle({ authorId: user.email, category: 'Rascunhos' });
            toast({ title: "Sucesso!", description: "Novo artigo criado em 'Rascunhos'." });
            router.push(`/knowledge-base/${newArticle.id}`);
        } catch (error) {
            console.error("Error creating article:", error);
            toast({ title: "Erro", description: "Não foi possível criar o artigo.", variant: "destructive" });
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

    const handleOpenSheet = (mode: 'add' | 'edit', categoryName = '') => {
        setSheetMode(mode);
        setCurrentCategory(categoryName);
        if (mode === 'edit') {
            setOriginalCategoryName(categoryName);
        }
        setIsSheetOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!currentCategory.trim()) {
            toast({ title: "Erro", description: "O nome da categoria não pode ser vazio.", variant: "destructive" });
            return;
        }

        try {
            if (sheetMode === 'add') {
                // To add a category, we create a dummy article and then delete it.
                // This is a workaround as we don't have a direct "add category" flow yet.
                const tempArticle = await createArticle({ authorId: user.email!, category: currentCategory });
                await deleteArticle(tempArticle.id);
                toast({ title: "Sucesso", description: `Categoria "${currentCategory}" criada.` });
            } else { // 'edit'
                await updateCategory({ oldName: originalCategoryName, newName: currentCategory });
                toast({ title: "Sucesso", description: `Categoria "${originalCategoryName}" renomeada para "${currentCategory}".` });
            }
            await refreshArticles();
            setIsSheetOpen(false);
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
                    <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleCreateArticle} disabled={loading}>
                        <PlusCircle className="h-4 w-4" />
                        Novo Artigo
                    </Button>
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
                                        <DropdownMenuItem onClick={() => handleOpenSheet('edit', category)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenSheet('add')}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nova Categoria
                            </DropdownMenuItem>
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
                        <Accordion type="multiple" defaultValue={groupedArticles.map(([category]) => category)} className="w-full space-y-2">
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
                            <Button className="mt-6" onClick={handleCreateArticle}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Criar Primeiro Artigo
                            </Button>
                        </div>
                     )}
                </CardContent>
            </Card>

             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>{sheetMode === 'add' ? 'Nova Categoria' : 'Editar Categoria'}</SheetTitle>
                        <SheetDescription>
                           {sheetMode === 'add' ? 'Digite o nome da nova categoria.' : `Renomear a categoria "${originalCategoryName}".`}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
                        <div className="grid gap-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category-name" className="text-right">
                                    Nome
                                </Label>
                                <Input
                                    id="category-name"
                                    value={currentCategory}
                                    onChange={(e) => setCurrentCategory(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Ex: Documentação"
                                />
                            </div>
                        </div>
                    </div>
                    <SheetFooter>
                         <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveCategory}>Salvar</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}

    