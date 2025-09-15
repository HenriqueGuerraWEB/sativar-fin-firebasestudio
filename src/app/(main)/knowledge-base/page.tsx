
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, BookText, MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKnowledgeBase } from '@/hooks/use-knowledge-base';
import { useAuth } from '@/hooks/use-auth';

export default function KnowledgeBasePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { articles, createArticle, deleteArticle, loading } = useKnowledgeBase();

    const handleCreateArticle = async () => {
        if (!user || !user.email) {
            toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para criar um artigo.", variant: "destructive" });
            return;
        }
        try {
            const newArticle = await createArticle({ authorId: user.email });
            toast({ title: "Sucesso!", description: "Novo artigo criado." });
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

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Base de Conhecimento</h1>
                    <p className="text-muted-foreground">Crie e gerencie tutoriais, documentações e anotações.</p>
                </div>
                <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleCreateArticle} disabled={loading}>
                    <PlusCircle className="h-4 w-4" />
                    Novo Artigo
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Artigos Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                     {loading && articles.length === 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead className="hidden sm:table-cell">Autor</TableHead>
                                        <TableHead className="hidden sm:table-cell text-right">Última Atualização</TableHead>
                                        <TableHead><span className="sr-only">Ações</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     ) : articles.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead className="hidden sm:table-cell">Autor</TableHead>
                                        <TableHead className="hidden sm:table-cell text-right">Última Atualização</TableHead>
                                        <TableHead><span className="sr-only">Ações</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {articles.map(article => (
                                        <TableRow key={article.id}>
                                            <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/knowledge-base/${article.id}`)}>{article.title}</TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">{article.authorId}</TableCell>
                                            <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{format(new Date(article.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
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
        </div>
    );
}
