
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { StorageService } from '@/lib/storage-service';
import type { KnowledgeBaseArticle, AddArticleInput } from '@/lib/types/knowledge-base-types';

export type { KnowledgeBaseArticle, AddArticleInput };

const COLLECTION_KEY = 'knowledge-base-articles';

export function useKnowledgeBase() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
    const [loading, setLoading] = useState(true);

    const loadArticles = useCallback(async () => {
        if (!user) {
            setArticles([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await StorageService.getCollection<KnowledgeBaseArticle>(COLLECTION_KEY);
            setArticles(data.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        } catch (error) {
            console.error("Failed to load articles:", error);
            toast({
                title: 'Erro ao Carregar Artigos',
                description: 'Não foi possível buscar os dados da base de conhecimento.',
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

    const addArticle = async (articleData: AddArticleInput): Promise<KnowledgeBaseArticle> => {
        if (!user) throw new Error("User not authenticated");
        const newArticle = await StorageService.addItem(COLLECTION_KEY, articleData);
        await loadArticles();
        return newArticle;
    };

    const getArticle = async (articleId: string): Promise<KnowledgeBaseArticle | null> => {
        if (!user) throw new Error("User not authenticated");
        return await StorageService.getItem(COLLECTION_KEY, articleId);
    }

    const updateArticle = async (articleId: string, updates: Partial<Omit<KnowledgeBaseArticle, 'id'>>) => {
        if (!user) throw new Error("User not authenticated");
        const updatedArticle = await StorageService.updateItem(COLLECTION_KEY, articleId, updates);
        await loadArticles(); // Refresh the list to reflect the `updatedAt` change
        return updatedArticle;
    };

    const deleteArticle = async (articleId: string) => {
        if (!user) throw new Error("User not authenticated");
        await StorageService.deleteItem(COLLECTION_KEY, articleId);
        await loadArticles();
    };

    return { articles, loading, addArticle, getArticle, updateArticle, deleteArticle, refreshArticles: loadArticles };
}
