
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from "@/components/ui/input";
import { useKnowledgeBase } from "@/hooks/use-knowledge-base";
import type { KnowledgeBaseArticle, ArticleMetadata } from "@/lib/types/knowledge-base-types";
import { Button } from '@/components/ui/button';
import { ArrowLeft, GripVertical, Trash2, Plus, Tag, Save, Smile, X, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import dynamic from 'next/dynamic';
import { isEqual } from 'lodash';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


const Editor = dynamic(() => import('@/components/editor/editor'), { ssr: false });

const emojis = ['💡', '📄', '📝', '✅', '🚀', '🔧', '⚙️', '📈', '📊', '🔗', '🧑‍💻', '🤔', '🗺️', '📌', '📖', '📚', '🔐', '🔑'];

export default function ArticlePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const articleId = Array.isArray(params.id) ? params.id[0] : params.id;

    const { getArticle, updateArticle, deleteArticle, loading, articles: allArticles } = useKnowledgeBase();
    
    const [openTabs, setOpenTabs] = useState<KnowledgeBaseArticle[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(articleId);
    
    const [isSaving, setIsSaving] = useState(false);
    
    // Find the full article data in the openTabs state
    const activeArticle = useMemo(() => openTabs.find(tab => tab.id === activeTabId), [openTabs, activeTabId]);
    
    // Find the original pristine article data from the main hook
    const originalActiveArticle = useMemo(() => {
        if (!activeTabId) return null;
        return allArticles.find(a => a.id === activeTabId);
    }, [activeTabId, allArticles]);

    // A version of the active article that includes full content for comparison
    const originalActiveArticleWithContent = useMemo(() => {
        if (!originalActiveArticle || !activeArticle) return null;
        return {
            ...originalActiveArticle,
            content: activeArticle.content,
            metadata: activeArticle.metadata,
        }
    }, [originalActiveArticle, activeArticle]);



    // Load initial article and handle direct navigation
    useEffect(() => {
        if (articleId) {
            setActiveTabId(articleId);
            const isAlreadyOpen = openTabs.some(tab => tab.id === articleId);
            if (!isAlreadyOpen) {
                getArticle(articleId).then(data => {
                    if (data) {
                        setOpenTabs(prev => {
                            if (prev.some(tab => tab.id === articleId)) {
                                return prev;
                            }
                            return [...prev, data];
                        });
                    } else {
                        toast({ title: "Erro", description: "Artigo não encontrado.", variant: "destructive" });
                        router.push('/knowledge-base');
                    }
                });
            }
        }
    }, [articleId, getArticle, router, toast, openTabs]);

    const handleArticleChange = (updates: Partial<KnowledgeBaseArticle>) => {
        setOpenTabs(prevTabs =>
            prevTabs.map(tab =>
                tab.id === activeTabId ? { ...tab, ...updates } : tab
            )
        );
    };
    
    const handleMetadataChange = (index: number, key: 'key' | 'value', value: string) => {
        if (!activeArticle) return;
        const newMetadata = [...(activeArticle.metadata || [])];
        newMetadata[index] = { ...newMetadata[index], [key]: value };
        handleArticleChange({ metadata: newMetadata });
    };

    const addMetadataProperty = () => {
        if (!activeArticle) return;
        const newMetadata = [...(activeArticle.metadata || []), { key: "", value: "" }];
        handleArticleChange({ metadata: newMetadata });
    };

    const removeMetadataProperty = (index: number) => {
        if (!activeArticle) return;
        const newMetadata = (activeArticle.metadata || []).filter((_, i) => i !== index);
        handleArticleChange({ metadata: newMetadata });
    };

    const handleSaveChanges = async () => {
        if (!activeArticle) return;
        
        setIsSaving(true);
        try {
            const { id, createdAt, authorId, ...updates } = activeArticle;
            await updateArticle(id, updates);
            toast({ title: "Sucesso", description: `Artigo "${activeArticle.title}" salvo.` });
        } catch (error) {
            toast({ title: "Erro ao Salvar", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteArticle = async () => {
        if (!activeArticle) return;
        try {
            await deleteArticle(activeArticle.id);
            toast({ title: "Sucesso", description: "Artigo excluído com sucesso." });
            
            const idToDelete = activeArticle.id;
            const newTabs = openTabs.filter(tab => tab.id !== idToDelete);
            setOpenTabs(newTabs);

            if (newTabs.length > 0) {
                const newActiveId = newTabs[0].id;
                router.push(`/knowledge-base/${newActiveId}`, { scroll: false });
            } else {
                router.push('/knowledge-base');
            }

        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível excluir o artigo.", variant: "destructive" });
        }
    };
    
    const handleTabClick = (tabId: string) => {
        if (activeTabId !== tabId) {
            router.push(`/knowledge-base/${tabId}`, { scroll: false });
        }
    };

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation(); // Prevent handleTabClick from firing

        const tabIndex = openTabs.findIndex(tab => tab.id === tabId);
        const newTabs = openTabs.filter(tab => tab.id !== tabId);
        setOpenTabs(newTabs);

        if (activeTabId === tabId) {
            if (newTabs.length > 0) {
                // Activate the next tab, or the previous one if the closed tab was the last one
                const newActiveIndex = tabIndex >= newTabs.length ? newTabs.length - 1 : tabIndex;
                const newActiveId = newTabs[newActiveIndex].id;
                router.push(`/knowledge-base/${newActiveId}`, { scroll: false });
            } else {
                router.push('/knowledge-base');
            }
        }
    };
    
    const isLoadingArticle = loading && !activeArticle;
    const hasChanges = useMemo(() => {
        if (!activeArticle || !originalActiveArticleWithContent) return false;
        // Use lodash isEqual for deep comparison of objects
        return !isEqual(activeArticle, originalActiveArticleWithContent);
    }, [activeArticle, originalActiveArticleWithContent]);


    return (
        <div className="flex flex-col h-full bg-background">
             <div className="flex items-center justify-between p-2 border-b gap-4 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => router.push('/knowledge-base')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                 <div className="flex items-center gap-2">
                     <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving} size="sm">
                         <Save className="mr-2 h-4 w-4" />
                         {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="sm" disabled={!activeArticle}>
                                 <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o artigo &quot;{activeArticle?.title}&quot;.
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
            
            <div className="flex flex-1 overflow-hidden">
                <div className="flex flex-col flex-1 h-full">
                    {/* Tabs Bar */}
                     <div className="flex border-b flex-shrink-0">
                         {openTabs.map(tab => (
                             <div
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 p-2 border-r cursor-pointer text-sm",
                                    activeTabId === tab.id ? 'bg-muted' : 'text-muted-foreground hover:bg-muted/50'
                                )}
                            >
                                {tab.icon ? <span>{tab.icon}</span> : <FileText className="h-4 w-4"/>}
                                <span className="whitespace-nowrap">{tab.title}</span>
                                 <Button variant="ghost" size="icon" className="h-5 w-5 ml-2" onClick={(e) => handleCloseTab(e, tab.id)}>
                                    <X className="h-3 w-3"/>
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Article Content */}
                    <div className="flex-grow overflow-y-auto p-4 sm:p-8 md:p-12 w-full">
                        {isLoadingArticle ? (
                            <div className="space-y-8 max-w-4xl mx-auto">
                                <Skeleton className="h-12 w-3/4" />
                                <div className="space-y-4">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                </div>
                                <Skeleton className="h-64 w-full" />
                            </div>
                        ) : activeArticle ? (
                             <div className="max-w-4xl mx-auto">
                                <div className="mb-8 group">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" className="text-6xl h-auto w-auto p-0 mb-4 -ml-4 hover:bg-muted">
                                                {activeArticle.icon ? (<span>{activeArticle.icon}</span>) : (<Smile className="h-12 w-12 text-muted-foreground opacity-25 group-hover:opacity-100" />)}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-2">
                                            <div className="grid grid-cols-6 gap-1">
                                                {emojis.map((emoji) => (
                                                    <Button key={emoji} variant="ghost" size="icon" onClick={() => handleArticleChange({ icon: emoji })} className="text-2xl">{emoji}</Button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Input
                                        value={activeArticle.title}
                                        onChange={(e) => handleArticleChange({ title: e.target.value })}
                                        placeholder="Título do Artigo"
                                        className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                                    />
                                    <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                                        <Tag className="h-4 w-4" />
                                        <Input 
                                            value={activeArticle.category || ''}
                                            onChange={(e) => handleArticleChange({ category: e.target.value })}
                                            placeholder="Sem categoria"
                                            className="border-none shadow-none focus-visible:ring-0 p-1 h-auto text-sm w-auto"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mb-8">
                                    {(activeArticle.metadata || []).map((meta, index) => (
                                        <div key={index} className="flex items-center gap-2 group">
                                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab group-hover:opacity-100 opacity-0 transition-opacity" />
                                            <Input value={meta.key} onChange={(e) => handleMetadataChange(index, 'key', e.target.value)} placeholder="Propriedade" className="font-semibold border-none shadow-none focus-visible:ring-0 p-1 h-auto w-32" />
                                            <Input value={meta.value} onChange={(e) => handleMetadataChange(index, 'value', e.target.value)} placeholder="Valor" className="border-none shadow-none focus-visible:ring-0 p-1 h-auto flex-1" />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:opacity-100 opacity-0 transition-opacity" onClick={() => removeMetadataProperty(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={addMetadataProperty}><Plus className="mr-2 h-4 w-4" /> Adicionar propriedade</Button>
                                </div>

                                <Editor
                                    key={activeArticle.id} // Re-mount editor on tab change
                                    initialContent={activeArticle.content}
                                    onChange={(content) => handleArticleChange({ content })}
                                />
                            </div>
                        ) : (
                             <div className="text-center py-20 text-muted-foreground">
                                <p>Selecione um artigo para começar.</p>
                                <Button variant="link" onClick={() => router.push('/knowledge-base')}>Voltar para a lista de artigos</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

    