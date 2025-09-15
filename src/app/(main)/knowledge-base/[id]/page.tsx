"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import type { KnowledgeBaseArticle, ArticleMetadata } from "@/lib/types/knowledge-base-types";
import { Button } from '@/components/ui/button';
import { ArrowLeft, GripVertical, Trash2, Plus, Tag } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/components/editor/editor'), { ssr: false });

export default function ArticlePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const articleId = Array.isArray(params.id) ? params.id[0] : params.id;

    const { getArticle, updateArticle, deleteArticle, loading } = useKnowledgeBase();
    const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [content, setContent] = useState<any>(null);
    const [metadata, setMetadata] = useState<ArticleMetadata[]>([]);
    
    // Debounce state
    const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleDebouncedUpdate = useCallback((updates: Partial<KnowledgeBaseArticle>) => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        
        const newTimeout = setTimeout(() => {
            if (articleId && article) {
                updateArticle(articleId, updates)
                    .catch(() => toast({ title: "Erro de Salvamento", description: "Não foi possível salvar as alterações.", variant: "destructive" }));
            }
        }, 1500); // 1.5 second debounce

        setDebounceTimeout(newTimeout);

    }, [articleId, article, updateArticle, toast, debounceTimeout]);


    useEffect(() => {
        if (articleId) {
            getArticle(articleId).then(data => {
                if (data) {
                    setArticle(data);
                    setTitle(data.title);
                    setCategory(data.category || '');
                    setContent(data.content || {});
                    setMetadata(Array.isArray(data.metadata) ? data.metadata : []);
                } else {
                    toast({ title: "Erro", description: "Artigo não encontrado.", variant: "destructive" });
                    router.push('/knowledge-base');
                }
            });
        }
         // Clear timeout on unmount
        return () => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
        };
    }, [articleId, getArticle, router, toast]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        handleDebouncedUpdate({ title: e.target.value });
    };
    
    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCategory(e.target.value);
        handleDebouncedUpdate({ category: e.target.value });
    }

    const handleContentChange = (newContent: any) => {
        setContent(newContent);
        handleDebouncedUpdate({ content: newContent });
    };
    
    const handleMetadataChange = (index: number, key: string, value: string) => {
        const newMetadata = [...metadata];
        newMetadata[index] = { ...newMetadata[index], [key]: value };
        setMetadata(newMetadata);
        handleDebouncedUpdate({ metadata: newMetadata });
    };

    const addMetadataProperty = () => {
        const newMetadata = [...metadata, { key: "", value: "" }];
        setMetadata(newMetadata);
        handleDebouncedUpdate({ metadata: newMetadata });
    };

    const removeMetadataProperty = (index: number) => {
        const newMetadata = metadata.filter((_, i) => i !== index);
        setMetadata(newMetadata);
        handleDebouncedUpdate({ metadata: newMetadata });
    };

    const handleDeleteArticle = async () => {
        try {
            await deleteArticle(articleId);
            toast({ title: "Sucesso", description: "Artigo excluído com sucesso." });
            router.push('/knowledge-base');
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível excluir o artigo.", variant: "destructive" });
        }
    };
    
    const isLoading = loading || !article;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
                <Button variant="ghost" size="sm" onClick={() => router.push('/knowledge-base')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </Button>
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
                            <AlertDialogAction onClick={handleDeleteArticle}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 sm:p-8 md:p-12 max-w-4xl mx-auto w-full">
                {isLoading ? (
                    <div className="space-y-8">
                        <Skeleton className="h-12 w-3/4" />
                        <div className="space-y-4">
                           <Skeleton className="h-8 w-full" />
                           <Skeleton className="h-8 w-full" />
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <Input
                                value={title}
                                onChange={handleTitleChange}
                                placeholder="Título do Artigo"
                                className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                            />
                             <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                                <Tag className="h-4 w-4" />
                                <Input 
                                    value={category}
                                    onChange={handleCategoryChange}
                                    placeholder="Sem categoria"
                                    className="border-none shadow-none focus-visible:ring-0 p-1 h-auto text-sm w-auto"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 mb-8">
                             {metadata.map((meta, index) => (
                                <div key={index} className="flex items-center gap-2 group">
                                     <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab group-hover:opacity-100 opacity-0 transition-opacity" />
                                    <Input 
                                        value={meta.key} 
                                        onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                                        placeholder="Propriedade"
                                        className="font-semibold border-none shadow-none focus-visible:ring-0 p-1 h-auto w-32"
                                    />
                                    <Input 
                                        value={meta.value} 
                                        onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                                        placeholder="Valor"
                                        className="border-none shadow-none focus-visible:ring-0 p-1 h-auto flex-1"
                                    />
                                     <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:opacity-100 opacity-0 transition-opacity" onClick={() => removeMetadataProperty(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                             <Button variant="ghost" size="sm" onClick={addMetadataProperty}>
                                <Plus className="mr-2 h-4 w-4" /> Adicionar propriedade
                            </Button>
                        </div>

                        <Editor
                            initialContent={content}
                            onChange={handleContentChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
