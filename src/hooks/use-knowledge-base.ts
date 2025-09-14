
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { StorageService } from '@/lib/storage-service';
import type { KnowledgeBaseArticle, ArticleListItem, CreateArticleInput, UpdateArticleInput } from '@/lib/types/knowledge-base-types';

export type { KnowledgeBaseArticle };

const COLLECTION_KEY = 'knowledge-base-articles';

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
            const data = await StorageService.getCollection<ArticleListItem>(COLLECTION_KEY);
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
        try {
            return await StorageService.getItem<KnowledgeBaseArticle>(COLLECTION_KEY, articleId);
        } catch (error) {
            console.error(`Failed to get article ${articleId}:`, error);
            toast({ title: 'Erro', description: 'Não foi possível carregar o artigo.', variant: 'destructive'});
            return null;
        }
    }, [user, toast]);

    const createArticle = async (articleData: CreateArticleInput): Promise<KnowledgeBaseArticle> => {
        if (!user) throw new Error("User not authenticated");
        const newArticle = await StorageService.addItem<KnowledgeBaseArticle>(COLLECTION_KEY, articleData);
        await loadArticles();
        return newArticle;
    };

    const updateArticle = async (articleId: string, updates: UpdateArticleInput): Promise<KnowledgeBaseArticle | null> => {
        if (!user) throw new Error("User not authenticated");
        const updatedArticle = await StorageService.updateItem<KnowledgeBaseArticle>(COLLECTION_KEY, articleId, updates);
        await loadArticles();
        return updatedArticle;
    };

    const deleteArticle = async (articleId: string) => {
        if (!user) throw new Error("User not authenticated");
        await StorageService.deleteItem(COLLECTION_KEY, articleId);
        await loadArticles();
    };

    return { articles, loading, getArticle, createArticle, updateArticle, deleteArticle, refreshArticles: loadArticles };
}
