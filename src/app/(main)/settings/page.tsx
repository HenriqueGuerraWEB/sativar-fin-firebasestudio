
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { testDbConnection } from '@/ai/flows/test-db-connection-flow';
import { DataMigrationInput } from '@/lib/types/migration-types';
import type { CompanySettings } from '@/lib/types/company-settings-types';
import { updateAdmin } from '@/ai/flows/users-flow';


const emptySettings: CompanySettings = {
    id: 'single-settings',
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
    const { user, refreshUser } = useAuth();
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [adminDetails, setAdminDetails] = useState({ name: '', email: '' });
    const [passwordFields, setPasswordFields] = useState({ newPassword: '', confirmPassword: '' });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingAdmin, setIsSavingAdmin] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [dbLogs, setDbLogs] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [isMigrationAlertOpen, setIsMigrationAlertOpen] = useState(false);
    const [isDbConnectionOk, setIsDbConnectionOk] = useState(false);


    useEffect(() => {
        const loadSettings = async () => {
            if(user) {
                setIsLoading(true);
                try {
                    const storedSettings = await StorageService.getItem<CompanySettings>('company-settings', 'single-settings');
                    if (storedSettings) {
                        setSettings(storedSettings);
                    } else {
                        setSettings(emptySettings);
                    }
                    setAdminDetails({ name: user.name, email: user.email });

                } catch (error) {
                    console.error("Error loading settings: ", error);
                    toast({
                        title: "Erro ao Carregar",
                        description: "Não foi possível carregar as configurações.",
                        variant: "destructive"
                    });
                }
                setIsLoading(false);
            }
        };
        loadSettings();
    }, [user, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: value }));
    };
    
    const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setAdminDetails(prev => ({ ...prev, [id]: value }));
    }
    
    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setPasswordFields(prev => ({ ...prev, [id]: value }));
    }

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
        try {
            await StorageService.updateItem('company-settings', 'single-settings', settings);
            toast({ title: "Sucesso!", description: "Configurações da empresa salvas com sucesso." });
        } catch (error) {
             console.error("Error saving settings: ", error);
             toast({ title: "Erro ao Salvar", description: "Não foi possível salvar as configurações da empresa.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAdminSettings = async () => {
        if (!user) { // This check is mostly for client-side feedback
            toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
            return;
        }
        if (passwordFields.newPassword && passwordFields.newPassword !== passwordFields.confirmPassword) {
            toast({ title: "Erro", description: "As novas senhas não coincidem.", variant: "destructive" });
            return;
        }
         if (passwordFields.newPassword && passwordFields.newPassword.length < 6) {
            toast({ title: "Erro", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
            return;
        }

        setIsSavingAdmin(true);
        try {
            const updates: any = {};
            if (adminDetails.name !== user.name) updates.name = adminDetails.name;
            if (adminDetails.email !== user.email) updates.email = adminDetails.email;
            if (passwordFields.newPassword) updates.password = passwordFields.newPassword;

            if (Object.keys(updates).length > 0) {
                await updateAdmin(updates);
                toast({ title: "Sucesso!", description: "Dados do administrador atualizados." });
                await refreshUser(); // Refresh user data in the auth context
                setPasswordFields({ newPassword: '', confirmPassword: '' });
            } else {
                toast({ title: "Nenhuma alteração", description: "Nenhum dado foi modificado." });
            }
        } catch (error: any) {
            console.error("Error saving admin settings: ", error);
            toast({ title: "Erro ao Salvar", description: `Não foi possível salvar os dados do administrador. ${error.message}`, variant: "destructive" });
        } finally {
            setIsSavingAdmin(false);
        }
    };


    const handleTestConnection = async () => {
        setIsTesting(true);
        setIsDbConnectionOk(false);
        let logs = `[${new Date().toISOString()}] Iniciando teste de conexão...\n`;
        logs += `[${new Date().toISOString()}] Verificando o modo de armazenamento...\n`;
        setDbLogs(logs);

        if (isDbEnabled) {
            logs += `[${new Date().toISOString()}] INFO: A aplicação está configurada para usar o banco de dados MySQL.\n`;
            setDbLogs(logs);
            try {
                const result = await testDbConnection();
                logs += `[${new Date().toISOString()}] RESPOSTA DO SERVIDOR: ${result.message}\n`;
                if (result.success) {
                    setIsDbConnectionOk(true);
                    toast({ title: "Sucesso!", description: result.message });
                } else {
                    toast({ title: "Erro de Conexão", description: result.message, variant: "destructive" });
                }
            } catch (error: any) {
                 logs += `[${new Date().toISOString()}] ERRO CRÍTICO: Falha ao chamar o fluxo de teste. ${error.message}\n`;
                 toast({ title: "Erro", description: "Não foi possível executar o teste de conexão.", variant: "destructive" });
            }

        } else {
            logs += `[${new Date().toISOString()}] INFO: A aplicação está configurada para usar 'localStorage'.\n`;
            logs += `[${new Date().toISOString()}] AVISO: Para testar a conexão MySQL, defina a variável NEXT_PUBLIC_DATABASE_ENABLED como 'true' no seu ambiente.\n`;
            toast({ title: "Modo LocalStorage", description: "A aplicação está usando o armazenamento local. A conexão com o MySQL não foi testada." });
        }

        logs += `[${new Date().toISOString()}] Teste de conexão finalizado.`;
        setDbLogs(logs);
        setIsTesting(false);
    }
    
    const handleStartMigration = () => {
        setIsMigrationAlertOpen(true);
    }

    const handleConfirmMigration = async () => {
        setIsMigrationAlertOpen(false);
        setIsMigrating(true);
        try {
            // Explicitly fetch all data from localStorage to be migrated
            const clients = LocalStorageService.getCollection('clients');
            const plans = LocalStorageService.getCollection('plans');
            const invoices = LocalStorageService.getCollection('invoices');
            const expenses = LocalStorageService.getCollection('expenses');
            const expenseCategories = LocalStorageService.getCollection('expenseCategories');
            const tasks = LocalStorageService.getCollection('tasks');
            const articles = LocalStorageService.getCollection('knowledge-base-articles');
            const settingsData = LocalStorageService.getItem<CompanySettings>('company-settings', 'single-settings');
            const users = LocalStorageService.getCollection('sativar-users');

            const migrationData: DataMigrationInput = {
                clients: clients.length > 0 ? clients : undefined,
                plans: plans.length > 0 ? plans : undefined,
                invoices: invoices.length > 0 ? invoices : undefined,
                expenses: expenses.length > 0 ? expenses : undefined,
                expenseCategories: expenseCategories.length > 0 ? expenseCategories : undefined,
                tasks: tasks.length > 0 ? tasks : undefined,
                articles: articles.length > 0 ? articles : undefined,
                settings: settingsData || undefined,
                users: users.length > 0 ? users : undefined,
            };

            const result = await migrateData(migrationData);
            
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
                <Card>
                    <CardHeader>
                        <CardTitle>Conta de Administrador</CardTitle>
                        <CardDescription>Gerencie seus dados de acesso. Use o banco de dados para maior segurança.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input id="name" value={adminDetails.name} onChange={handleAdminInputChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={adminDetails.email} onChange={handleAdminInputChange} />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="newPassword">Nova Senha</Label>
                                <Input id="newPassword" type="password" value={passwordFields.newPassword} onChange={handlePasswordInputChange} placeholder="Deixe em branco para não alterar" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                <Input id="confirmPassword" type="password" value={passwordFields.confirmPassword} onChange={handlePasswordInputChange} />
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleSaveAdminSettings} disabled={isSavingAdmin || !isDbEnabled} >
                            {isSavingAdmin ? 'Salvando...' : 'Salvar Dados do Admin'}
                        </Button>
                    </CardFooter>
                </Card>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Detalhes da Empresa</CardTitle>
                            <CardDescription>Essas informações serão exibidas nos recibos e faturas.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome da Empresa</Label>
                                <Input id="name" value={settings?.name ?? ''} onChange={handleInputChange} placeholder="Sua Empresa LTDA" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" value={settings?.cpf ?? ''} onChange={handleInputChange} placeholder="000.000.000-00" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cnpj">CNPJ</Label>
                                    <Input id="cnpj" value={settings?.cnpj ?? ''} onChange={handleInputChange} placeholder="00.000.000/0000-00" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Textarea id="address" value={settings?.address ?? ''} onChange={handleInputChange} placeholder="Rua Exemplo, 123, Bairro, Cidade - Estado, CEP" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input id="phone" value={settings?.phone ?? ''} onChange={handleInputChange} placeholder="(00) 12345-6789" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={settings?.email ?? ''} onChange={handleInputChange} placeholder="contato@suaempresa.com" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="website">Website</Label>
                                <Input id="website" value={settings?.website ?? ''} onChange={handleInputChange} placeholder="www.suaempresa.com" />
                            </div>
                        </CardContent>
                         <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleSaveSettings} disabled={isSaving}>
                                {isSaving ? 'Salvando...' : 'Salvar Configurações da Empresa'}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Logo da Empresa</CardTitle>
                            <CardDescription>Faça o upload da sua logo. Recomendado: 200x100 pixels.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="w-full h-32 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                                {settings?.logoDataUrl ? (
                                    <img src={settings.logoDataUrl} alt="Logo preview" className="object-contain max-h-full max-w-full" />
                                ) : (
                                    <p className="text-sm text-muted-foreground">Pré-visualização</p>
                                )}
                            </div>
                            <div className="flex w-full gap-2">
                                <Input id="logo" type="file" onChange={handleLogoChange} accept="image/png, image/jpeg, image/svg+xml" className="text-sm flex-grow" />
                                {settings?.logoDataUrl && (
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
                        <CardDescription>Teste a conexão com seu banco de dados MySQL e migre os dados do armazenamento local. Modo atual: <strong>{isDbEnabled ? 'MySQL' : 'localStorage'}</strong>.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleTestConnection} disabled={isTesting}>
                                <Server className="mr-2 h-4 w-4" />
                                {isTesting ? 'Testando...' : 'Testar Conexão'}
                            </Button>

                            <Button onClick={handleStartMigration} disabled={!isDbEnabled || !isDbConnectionOk || isMigrating}>
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
                </>
            )}
             <AlertDialog open={isMigrationAlertOpen} onOpenChange={setIsMigrationAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Migração de Dados</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a enviar todos os dados salvos localmente (se houver) para o banco de dados MySQL. Esta ação irá inserir os dados nas tabelas correspondentes. Deseja continuar?
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
