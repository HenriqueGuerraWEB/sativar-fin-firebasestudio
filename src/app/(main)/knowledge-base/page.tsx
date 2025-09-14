
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, BookText } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addArticle } from '@/ai/flows/knowledge-base-flow';
import { useAuth } from '@/hooks/use-auth';
import { getArticles } from '@/ai/flows/knowledge-base-flow';
import type { KnowledgeBaseArticle } from '@/lib/types/knowledge-base-types';

type ArticleMeta = Omit<KnowledgeBaseArticle, 'content'>;

export default function KnowledgeBasePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [articles, setArticles] = useState<ArticleMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const fetchArticles = async () => {
            setIsLoading(true);
            try {
                const fetchedArticles = await getArticles();
                setArticles(fetchedArticles);
            } catch (error) {
                console.error("Failed to fetch articles:", error);
                toast({
                    title: "Erro ao Carregar",
                    description: "Não foi possível buscar os artigos da base de conhecimento.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchArticles();
    }, [toast]);

    const handleCreateNewArticle = async () => {
        setIsCreating(true);
        try {
            const newArticle = await addArticle({
                title: "Artigo sem Título",
                content: [],
                metadata: {},
                authorId: user?.email, // Or user ID if you have one
            });
            toast({ title: "Sucesso", description: "Novo artigo criado. Redirecionando..." });
            router.push(`/knowledge-base/${newArticle.id}`);
        } catch (error) {
            console.error("Failed to create article:", error);
            toast({
                title: "Erro ao Criar",
                description: "Não foi possível criar um novo artigo.",
                variant: "destructive"
            });
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Base de Conhecimento</h1>
                    <p className="text-muted-foreground">Crie e gerencie documentação interna, tutoriais e anotações.</p>
                </div>
                <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleCreateNewArticle} disabled={isCreating}>
                    <PlusCircle className="h-4 w-4" />
                    {isCreating ? 'Criando...' : 'Novo Artigo'}
                </Button>
            </div>
            
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            ) : articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                    <BookText className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum artigo encontrado</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Comece criando seu primeiro artigo na base de conhecimento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map(article => (
                        <Card 
                            key={article.id} 
                            className="flex flex-col cursor-pointer hover:border-primary transition-colors"
                            onClick={() => router.push(`/knowledge-base/${article.id}`)}
                        >
                            <CardHeader className="flex-grow">
                                <CardTitle className="text-xl">{article.title}</CardTitle>
                                <CardDescription>
                                    Atualizado em {format(new Date(article.updatedAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
