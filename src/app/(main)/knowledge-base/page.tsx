
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, BookText } from "lucide-react";
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
    const { articles, createArticle, loading } = useKnowledgeBase();

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
                                        <TableHead className="text-right">Última Atualização</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
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
                                        <TableHead className="text-right">Última Atualização</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {articles.map(article => (
                                        <TableRow key={article.id} className="cursor-pointer" onClick={() => router.push(`/knowledge-base/${article.id}`)}>
                                            <TableCell className="font-medium">{article.title}</TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">{article.authorId}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{format(new Date(article.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
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
