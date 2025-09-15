"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Check } from 'lucide-react';
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


export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { getNotificationTasks, addTask, updateTask, refreshTasks } = useTasks();
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [hasUnseen, setHasUnseen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);


  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const tasks = await getNotificationTasks();
      setUrgentTasks(tasks);
      // Logic to determine if there are new unseen tasks can be more sophisticated
      // For now, if there are tasks, we consider them unseen until the popover is opened.
      if (tasks.length > 0) {
        setHasUnseen(true);
      }
    } catch (error) {
      console.error("Failed to fetch notification tasks:", error);
    }
  }, [user, getNotificationTasks]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5 * 60 * 1000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, [fetchTasks]);

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
        await fetchTasks(); // Re-fetch to get the updated list
        await refreshTasks(); // This will refresh the main tasks view if open
        toast({ title: "Sucesso!", description: "Nova tarefa adicionada para hoje." });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível adicionar a tarefa.", variant: "destructive" });
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnseen && urgentTasks.length > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          <span className="sr-only">Ver notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4">
          <h4 className="font-medium leading-none">Caixa de Entrada</h4>
          <p className="text-sm text-muted-foreground">
            {urgentTasks.length > 0 ? `Você tem ${urgentTasks.length} tarefa(s) precisando de atenção.` : 'Tudo em dia por aqui!'}
          </p>
        </div>
        <div className="grid max-h-60 gap-1 overflow-y-auto px-4 pb-4">
            {urgentTasks.length > 0 ? (
              urgentTasks.map(task => (
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
              ))
            ) : (
              <p className="py-4 text-sm text-muted-foreground text-center">Nenhuma notificação nova.</p>
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
