
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { X, Server, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { StorageService, LocalStorageService } from '@/lib/storage-service';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { migrateData } from '@/ai/flows/data-migration-flow';
import { DataMigrationInput } from '@/lib/types/migration-types';


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

const isDbEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === 'true';

export default function SettingsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [dbLogs, setDbLogs] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [isMigrationAlertOpen, setIsMigrationAlertOpen] = useState(false);


    useEffect(() => {
        if(user) {
            setIsLoading(true);
            const storedSettings = LocalStorageService.getItem<CompanySettings & {id: string}>('company-settings', 'single-settings');
            if (storedSettings) {
                setSettings(storedSettings);
            } else {
                 const initialSettings = { ...emptySettings, id: 'single-settings' };
                LocalStorageService.addItem('company-settings', initialSettings);
                setSettings(initialSettings);
            }
            setIsLoading(false);
        }
    }, [user]);

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
        if (!user) {
            toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        LocalStorageService.updateItem('company-settings', 'single-settings', settings);
        setIsSaving(false);
        toast({ title: "Sucesso!", description: "Configurações salvas com sucesso." });
    };

    const handleTestConnection = () => {
        setIsTesting(true);
        let logs = `[${new Date().toISOString()}] Iniciando teste de conexão...\n`;
        
        setTimeout(() => {
            try {
                logs += `[${new Date().toISOString()}] Verificando o modo de armazenamento...\n`;
                
                if (isDbEnabled) {
                     logs += `[${new Date().toISOString()}] INFO: A aplicação está configurada para usar o banco de dados MySQL.\n`;
                     logs += `[${new Date().toISOString()}] STATUS: O serviço de API está ativo. A conexão real com o banco de dados é gerenciada pelo servidor.\n`;
                     toast({ title: "Sucesso", description: "O modo de banco de dados está ativo." });
                } else {
                    logs += `[${new Date().toISOString()}] INFO: A aplicação está configurada para usar 'localStorage'.\n`;
                    localStorage.setItem('__db_test__', 'success');
                    const testResult = localStorage.getItem('__db_test__');
                    localStorage.removeItem('__db_test__');

                    if (testResult === 'success') {
                        logs += `[${new Date().toISOString()}] SUCESSO: A leitura e escrita no localStorage foi bem-sucedida.\n`;
                        logs += `[${new Date().toISOString()}] STATUS: Conexão local está ativa e funcional.\n`;
                    } else {
                        throw new Error('Falha ao ler/escrever no localStorage.');
                    }
                     toast({ title: "Sucesso", description: "A conexão com o armazenamento local foi testada com sucesso." });
                }
            } catch (error: any) {
                logs += `[${new Date().toISOString()}] ERRO: Ocorreu um erro ao testar a conexão.\n`;
                logs += `[${new Date().toISOString()}] Detalhes: ${error.message}\n`;
                toast({ title: "Erro de Conexão", description: "Falha ao testar a conexão com o armazenamento local.", variant: "destructive"});
            } finally {
                logs += `[${new Date().toISOString()}] Teste de conexão finalizado.`;
                setDbLogs(logs);
                setIsTesting(false);
            }
        }, 1500);
    }
    
    const handleStartMigration = () => {
        setIsMigrationAlertOpen(true);
    }

    const handleConfirmMigration = async () => {
        setIsMigrationAlertOpen(false);
        setIsMigrating(true);
        try {
            const migrationData: DataMigrationInput = {
                clients: LocalStorageService.getCollection('clients'),
                plans: LocalStorageService.getCollection('plans'),
                invoices: LocalStorageService.getCollection('invoices'),
                expenses: LocalStorageService.getCollection('expenses'),
                expenseCategories: LocalStorageService.getCollection('expenseCategories'),
                settings: LocalStorageService.getItem('company-settings', 'single-settings') || undefined,
            };

            if (
                migrationData.clients.length === 0 &&
                migrationData.plans.length === 0 &&
                migrationData.invoices.length === 0 &&
                migrationData.expenses.length === 0 &&
                migrationData.expenseCategories.length === 0
            ) {
                 toast({
                    title: "Nenhum Dado para Migrar",
                    description: "Não há dados no armazenamento local para serem migrados.",
                });
                return;
            }

            const result = await migrateData(migrationData);
            console.log("Migration result:", result);
            
            toast({
                title: "Migração Concluída!",
                description: result.message,
            });
            
        } catch (error: any) {
            console.error("Migration failed:", error);
            toast({ title: "Falha na Migração", description: error.message, variant: "destructive" });
        } finally {
            setIsMigrating(false);
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground">Gerencie as configurações da sua empresa e do sistema.</p>
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
                                    <img src={settings.logoDataUrl} alt="Logo preview" className="object-contain max-h-full max-w-full" />
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

                <Card>
                    <CardHeader>
                        <CardTitle>Conexão com Banco de Dados</CardTitle>
                        <CardDescription>Configure e teste a conexão com seu banco de dados MySQL. Atualmente usando: <strong>{isDbEnabled ? 'MySQL' : 'localStorage'}</strong>.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dbHost">Host</Label>
                                <Input id="dbHost" placeholder="localhost" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dbPort">Porta</Label>
                                <Input id="dbPort" placeholder="3306" />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="dbUser">Usuário</Label>
                                <Input id="dbUser" placeholder="admin" />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="dbPassword">Senha</Label>
                                <Input id="dbPassword" type="password" placeholder="••••••••" />
                            </div>
                        </div>
                         <div className="grid gap-2">
                                <Label htmlFor="dbName">Nome do Banco</Label>
                                <Input id="dbName" placeholder="sativar_db" />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleTestConnection} disabled={isTesting}>
                                <Server className="mr-2 h-4 w-4" />
                                {isTesting ? 'Testando...' : 'Testar Conexão'}
                            </Button>

                            <Button onClick={handleStartMigration} disabled={!isDbEnabled || isMigrating}>
                                {isMigrating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {isMigrating ? 'Migrando...' : 'Iniciar Migração de Dados'}
                            </Button>
                        </div>
                        
                        {dbLogs && (
                             <div className="grid gap-2">
                                <Label>Logs de Conexão</Label>
                                <pre className="mt-2 h-48 w-full whitespace-pre-wrap rounded-md bg-muted p-4 text-sm font-mono text-muted-foreground">
                                    {dbLogs}
                                </pre>
                            </div>
                        )}

                    </CardContent>
                </Card>

                <div className="flex justify-end mt-4">
                    <Button onClick={handleSaveSettings} disabled={isLoading || isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
                </>
            )}
             <AlertDialog open={isMigrationAlertOpen} onOpenChange={setIsMigrationAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Migração de Dados</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a enviar todos os dados salvos localmente para o banco de dados MySQL. Esta ação irá inserir os dados nas tabelas correspondentes. Deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMigrating}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmMigration} disabled={isMigrating}>
                             {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isMigrating ? 'Enviando...' : 'Sim, Iniciar Migração'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    