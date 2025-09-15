
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import type { KnowledgeBaseArticle, ArticleListItem, CreateArticleInput, UpdateArticleInput } from '@/lib/types/knowledge-base-types';
import { 
    getArticles as getArticlesFlow,
    getArticle as getArticleFlow,
    createArticle as createArticleFlow,
    updateArticle as updateArticleFlow,
    deleteArticle as deleteArticleFlow,
} from '@/ai/flows/knowledge-base-flow';

export type { KnowledgeBaseArticle };


export function useKnowledgeBase() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [articles, setArticles] = useState<ArticleListItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadArticles = useCallback(async () => {
        if (!user) {
            setArticles([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await getArticlesFlow();
            setArticles(data);
        } catch (error) {
            console.error("Failed to load articles:", error);
            toast({
                title: 'Erro ao Carregar Artigos',
                description: 'Não foi possível buscar os artigos.',
                variant: 'destructive',
            });
            setArticles([]);
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadArticles();
        }
    }, [user, authLoading, loadArticles]);

    const getArticle = useCallback(async (articleId: string): Promise<KnowledgeBaseArticle | null> => {
        if (!user) return null;
        setLoading(true);
        try {
            return await getArticleFlow(articleId);
        } catch (error) {
            console.error(`Failed to get article ${articleId}:`, error);
            toast({ title: 'Erro', description: 'Não foi possível carregar o artigo.', variant: 'destructive'});
            return null;
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    const createArticle = async (articleData: CreateArticleInput): Promise<KnowledgeBaseArticle> => {
        if (!user) throw new Error("User not authenticated");
        setLoading(true);
        try {
            const newArticle = await createArticleFlow(articleData);
            await loadArticles();
            return newArticle;
        } finally {
            setLoading(false);
        }
    };

    const updateArticle = async (articleId: string, updates: UpdateArticleInput): Promise<KnowledgeBaseArticle | null> => {
        if (!user) throw new Error("User not authenticated");
        // No loading state change here for smoother UX on debounced updates
        const updatedArticle = await updateArticleFlow({ articleId, updates });
        await loadArticles(); // Refresh the list in the background
        return updatedArticle;
    };

    const deleteArticle = async (articleId: string) => {
        if (!user) throw new Error("User not authenticated");
        setLoading(true);
        try {
            await deleteArticleFlow(articleId);
            await loadArticles();
        } finally {
            setLoading(false);
        }
    };

    return { articles, loading, getArticle, createArticle, updateArticle, deleteArticle, refreshArticles: loadArticles };
}
