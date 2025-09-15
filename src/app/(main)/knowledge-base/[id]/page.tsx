"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import type { KnowledgeBaseArticle, ArticleMetadata } from "@/lib/types/knowledge-base-types";
import { Button } from '@/components/ui/button';
import { ArrowLeft, GripVertical, Trash2, Plus, Tag, Save, Smile } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import dynamic from 'next/dynamic';
import { isEqual } from 'lodash';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const Editor = dynamic(() => import('@/components/editor/editor'), { ssr: false });

const emojis = ['💡', '📄', '📝', '✅', '🚀', '🔧', '⚙️', '📈', '📊', '🔗', '🧑‍💻', '🤔', '🗺️', '📌', '📖', '📚', '🔐', '🔑'];


export default function ArticlePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const articleId = Array.isArray(params.id) ? params.id[0] : params.id;

    const { getArticle, updateArticle, deleteArticle, loading } = useKnowledgeBase();
    
    const [originalArticle, setOriginalArticle] = useState<KnowledgeBaseArticle | null>(null);
    const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        if (articleId) {
            getArticle(articleId).then(data => {
                if (data) {
                    setArticle(data);
                    setOriginalArticle(JSON.parse(JSON.stringify(data))); // Deep copy for comparison
                } else {
                    toast({ title: "Erro", description: "Artigo não encontrado.", variant: "destructive" });
                    router.push('/knowledge-base');
                }
            });
        }
    }, [articleId, getArticle, router, toast]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(article) setArticle({ ...article, title: e.target.value });
    };

    const handleIconChange = (icon: string) => {
        if (article) setArticle({ ...article, icon });
    };
    
    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(article) setArticle({ ...article, category: e.target.value });
    }

    const handleContentChange = (newContent: any) => {
        if(article) setArticle({ ...article, content: newContent });
    };
    
    const handleMetadataChange = (index: number, key: 'key' | 'value', value: string) => {
        if (!article) return;
        const newMetadata = [...(article.metadata || [])];
        newMetadata[index] = { ...newMetadata[index], [key]: value };
        setArticle({ ...article, metadata: newMetadata });
    };

    const addMetadataProperty = () => {
        if (!article) return;
        const newMetadata = [...(article.metadata || []), { key: "", value: "" }];
        setArticle({ ...article, metadata: newMetadata });
    };

    const removeMetadataProperty = (index: number) => {
        if (!article) return;
        const newMetadata = (article.metadata || []).filter((_, i) => i !== index);
        setArticle({ ...article, metadata: newMetadata });
    };

    const handleSaveChanges = async () => {
        if (!article || !originalArticle) return;
        
        setIsSaving(true);
        try {
            const { id, createdAt, authorId, ...updates } = article;
            await updateArticle(id, updates);
            setOriginalArticle(JSON.parse(JSON.stringify(article))); // Update original state after saving
            toast({ title: "Sucesso", description: "Artigo salvo com sucesso." });
        } catch (error) {
            toast({ title: "Erro ao Salvar", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
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
    const hasChanges = !isEqual(originalArticle, article);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/knowledge-base')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
                         <Save className="mr-2 h-4 w-4" />
                         {isSaving ? 'Salvando...' : 'Salvar'}
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
                        <div className="mb-8 group">
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="text-6xl h-auto w-auto p-0 mb-4 -ml-4 hover:bg-muted"
                                    >
                                        {article.icon ? (
                                            <span>{article.icon}</span>
                                        ) : (
                                            <Smile className="h-12 w-12 text-muted-foreground opacity-25 group-hover:opacity-100" />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                    <div className="grid grid-cols-6 gap-1">
                                        {emojis.map((emoji) => (
                                            <Button
                                                key={emoji}
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleIconChange(emoji)}
                                                className="text-2xl"
                                            >
                                                {emoji}
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Input
                                value={article.title}
                                onChange={handleTitleChange}
                                placeholder="Título do Artigo"
                                className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                            />
                             <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                                <Tag className="h-4 w-4" />
                                <Input 
                                    value={article.category || ''}
                                    onChange={handleCategoryChange}
                                    placeholder="Sem categoria"
                                    className="border-none shadow-none focus-visible:ring-0 p-1 h-auto text-sm w-auto"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 mb-8">
                             {(article.metadata || []).map((meta, index) => (
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
                            initialContent={article.content}
                            onChange={handleContentChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
