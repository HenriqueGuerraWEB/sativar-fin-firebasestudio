
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTasks, Task } from '@/hooks/use-tasks';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getPlanRenewalAlerts, PlanRenewalAlert } from '@/ai/flows/notifications-flow';
import { Separator } from '../ui/separator';


export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { getNotificationTasks, addTask, updateTask, refreshTasks } = useTasks();
  
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [renewalAlerts, setRenewalAlerts] = useState<PlanRenewalAlert[]>([]);
  const [hasUnseen, setHasUnseen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const totalNotifications = urgentTasks.length + renewalAlerts.length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [tasks, alerts] = await Promise.all([
        getNotificationTasks(),
        getPlanRenewalAlerts()
      ]);
      setUrgentTasks(tasks);
      setRenewalAlerts(alerts);
      if (tasks.length > 0 || alerts.length > 0) {
        setHasUnseen(true);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [user, getNotificationTasks]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpenChange = (open: boolean) => {
    if (open && hasUnseen) {
      setHasUnseen(false);
    }
    if (!open) {
      setNewTaskTitle('');
    }
  };

  const handleToggleComplete = async (task: Task) => {
     const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
      try {
            await updateTask(task.id, { status: newStatus });
            // Optimistically update the UI
            setUrgentTasks(prev => prev.filter(t => t.id !== task.id));
            toast({ title: `Tarefa marcada como ${newStatus}.`});
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível atualizar a tarefa.", variant: "destructive" });
        }
  }

  const handleAddNewTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim() !== '') {
      setIsAdding(true);
      try {
        await addTask({
          title: newTaskTitle,
          dueDate: startOfToday().toISOString(),
          status: 'Pendente',
          description: null,
          parentId: null,
          relatedClientId: null,
          userId: user?.email ?? null,
        });
        setNewTaskTitle('');
        await fetchNotifications(); // Re-fetch to get the updated list
        await refreshTasks(); // This will refresh the main tasks view if open
        toast({ title: "Sucesso!", description: "Nova tarefa adicionada para hoje." });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível adicionar a tarefa.", variant: "destructive" });
      } finally {
        setIsAdding(false);
      }
    }
  };
  
  const navigateToInvoices = () => {
    router.push('/invoices');
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnseen && totalNotifications > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          <span className="sr-only">Ver notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <div className="p-4">
          <h4 className="font-medium leading-none">Caixa de Entrada</h4>
          <p className="text-sm text-muted-foreground">
            {totalNotifications > 0 ? `Você tem ${totalNotifications} notificações.` : 'Tudo em dia por aqui!'}
          </p>
        </div>
        <div className="grid max-h-80 gap-1 overflow-y-auto px-4 pb-4">
            {totalNotifications === 0 ? (
                 <p className="py-4 text-sm text-muted-foreground text-center">Nenhuma notificação nova.</p>
            ) : (
                <>
                {renewalAlerts.length > 0 && (
                    <div className='space-y-2'>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Renovações de Planos</p>
                        {renewalAlerts.map(alert => (
                            <div key={`${alert.clientId}-${alert.planId}`} className="group flex items-center gap-3 rounded-md p-2 hover:bg-muted cursor-pointer" onClick={navigateToInvoices}>
                                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                                <div className="grid gap-0.5 flex-1">
                                    <p className="text-sm font-medium leading-none">{alert.clientName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Plano <span className='font-semibold'>{alert.planName}</span> vence em {formatDistanceToNow(new Date(alert.nextDueDate), { locale: ptBR })}.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {urgentTasks.length > 0 && renewalAlerts.length > 0 && <Separator className="my-2" />}

                {urgentTasks.length > 0 && (
                     <div className='space-y-2'>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Tarefas Urgentes</p>
                         {urgentTasks.map(task => (
                            <div key={task.id} className="group flex items-center gap-2 rounded-md p-2 hover:bg-muted">
                               <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleToggleComplete(task)}>
                                    <div className={cn("h-4 w-4 rounded-sm border border-primary flex items-center justify-center", task.status === 'Concluída' && "bg-primary")}>
                                        {task.status === 'Concluída' && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                </Button>
                              <div className="grid gap-1 flex-1">
                                <p className="text-sm font-medium leading-none">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(task.dueDate) < startOfToday() ? 'Vencida ' : 'Vence '} 
                                    {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                            </div>
                        ))}
                     </div>
                )}
                </>
            )}
        </div>
        <div className="border-t p-2">
            <div className="relative">
                <Plus className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                    placeholder="Adicionar tarefa para hoje..." 
                    className="h-9 border-none bg-transparent pl-8 focus-visible:ring-0"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleAddNewTask}
                    disabled={isAdding}
                />
            </div>
        </div>
        <div className="border-t p-2">
            <Button variant="link" size="sm" className="w-full" onClick={() => router.push('/tasks')}>
                Ver todas as tarefas
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
