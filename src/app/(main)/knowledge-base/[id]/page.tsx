
"use client";

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { Block, PartialBlock } from "@blocknote/core";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from 'use-debounce';
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import type { KnowledgeBaseArticle } from "@/lib/types/knowledge-base-types";


export default function ArticlePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const { getArticle, updateArticle, loading } = useKnowledgeBase();
    const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const debouncedUpdates = useDebouncedCallback(async (editorContent: Block[]) => {
        if (article) {
             const jsonBlocks = editor.topLevelBlocks;
             await updateArticle(article.id, { content: jsonBlocks });
            toast({
              title: "Salvo Automaticamente",
              description: "Suas alterações foram salvas.",
            });
        }
    }, 2000);

    const handleTitleChange = useDebouncedCallback(async (newTitle: string) => {
        if (article) {
            await updateArticle(article.id, { title: newTitle });
            toast({
              title: "Título Atualizado",
              description: "O título do artigo foi salvo.",
            });
        }
    }, 1000);

    const editor = useBlockNote({
        initialContent: article?.content ? article.content as PartialBlock[] : undefined,
        onEditorContentChange: (editor) => {
            debouncedUpdates(editor.topLevelBlocks);
        }
    });


    useEffect(() => {
        const fetchArticle = async () => {
            if (!params.id) return;
            setIsLoading(true);
            try {
                const fetchedArticle = await getArticle(params.id);
                if (fetchedArticle) {
                    setArticle(fetchedArticle);
                } else {
                    toast({
                        title: "Artigo não encontrado",
                        description: "O artigo que você está procurando não existe.",
                        variant: "destructive"
                    });
                    router.push('/knowledge-base');
                }
            } catch (error) {
                console.error("Failed to fetch article:", error);
                toast({
                    title: "Erro ao Carregar",
                    description: "Não foi possível buscar o artigo.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchArticle();
    }, [params.id, router, toast, getArticle]);

    if (isLoading || !editor || loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto">
            <Input 
                defaultValue={article?.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto mb-8"
                placeholder="Título do Artigo"
            />
            <BlockNoteView 
                editor={editor} 
                theme={"dark"}
             />
        </div>
    );
}
