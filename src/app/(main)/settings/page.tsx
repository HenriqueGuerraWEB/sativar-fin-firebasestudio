
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { X } from 'lucide-react';

const SETTINGS_STORAGE_KEY = 'sativar-settings';

type CompanySettings = {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logoDataUrl: string;
    cpf: string;
    cnpj: string;
};

const emptySettings: CompanySettings = {
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoDataUrl: '',
    cpf: '',
    cnpj: '',
};

export default function SettingsPage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const getSettingsFromStorage = useCallback(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            // It's an object, not an array
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                // Merge with empty settings to ensure all keys are present
                return { ...emptySettings, ...parsed };
            }
            return emptySettings;
        } catch (error) {
            console.error("Error reading settings from localStorage:", error);
            return emptySettings;
        }
    }, []);

    const setSettingsToStorage = useCallback((newSettings: CompanySettings) => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
            console.error("Error writing settings to localStorage:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as configurações.", variant: "destructive" });
        }
    }, [toast]);


    useEffect(() => {
        setIsLoading(true);
        setSettings(getSettingsFromStorage());
        setIsLoading(false);
    }, [getSettingsFromStorage]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({ title: "Erro", description: "A imagem é muito grande. O limite é 2MB.", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, logoDataUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setSettings(prev => ({ ...prev, logoDataUrl: '' }));
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSettingsToStorage(settings);
        setIsSaving(false);
        toast({ title: "Sucesso!", description: "Configurações salvas com sucesso." });
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações da Empresa</h1>
                <p className="text-muted-foreground">Gerencie as configurações da sua empresa.</p>
            </div>
            {isLoading ? (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                        </div>
                        <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Detalhes da Empresa</CardTitle>
                            <CardDescription>Essas informações serão exibidas nos recibos e faturas.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome da Empresa</Label>
                                <Input id="name" value={settings.name} onChange={handleInputChange} placeholder="Sua Empresa LTDA" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" value={settings.cpf} onChange={handleInputChange} placeholder="000.000.000-00" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cnpj">CNPJ</Label>
                                    <Input id="cnpj" value={settings.cnpj} onChange={handleInputChange} placeholder="00.000.000/0000-00" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Textarea id="address" value={settings.address} onChange={handleInputChange} placeholder="Rua Exemplo, 123, Bairro, Cidade - Estado, CEP" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input id="phone" value={settings.phone} onChange={handleInputChange} placeholder="(00) 12345-6789" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={settings.email} onChange={handleInputChange} placeholder="contato@suaempresa.com" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="website">Website</Label>
                                <Input id="website" value={settings.website} onChange={handleInputChange} placeholder="www.suaempresa.com" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Logo da Empresa</CardTitle>
                            <CardDescription>Faça o upload da sua logo. Recomendado: 200x100 pixels.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="w-full h-32 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                                {settings.logoDataUrl ? (
                                    <Image src={settings.logoDataUrl} alt="Logo preview" width={160} height={80} className="object-contain max-h-full max-w-full" />
                                ) : (
                                    <p className="text-sm text-muted-foreground">Pré-visualização</p>
                                )}
                            </div>
                            <div className="flex w-full gap-2">
                                <Input id="logo" type="file" onChange={handleLogoChange} accept="image/png, image/jpeg, image/svg+xml" className="text-sm flex-grow" />
                                {settings.logoDataUrl && (
                                    <Button variant="destructive" size="icon" onClick={handleRemoveLogo}>
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Remover Logo</span>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSaveSettings} disabled={isLoading || isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
                </>
            )}
        </div>
    );
}

    

    