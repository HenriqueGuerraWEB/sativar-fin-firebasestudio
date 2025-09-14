
"use client";

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTasks, Task } from '@/hooks/use-tasks';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationBell() {
  const { user } = useAuth();
  const { getNotificationTasks } = useTasks();
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      try {
        const tasks = await getNotificationTasks();
        setUrgentTasks(tasks);
        if (tasks.length > 0) {
          setHasUnseen(true);
        }
      } catch (error) {
        console.error("Failed to fetch notification tasks:", error);
      }
    };

    fetchTasks(); // Initial fetch
    const interval = setInterval(fetchTasks, 5 * 60 * 1000); // Poll every 5 minutes

    return () => clearInterval(interval);
  }, [user, getNotificationTasks]);

  const handleOpenChange = (open: boolean) => {
    if (open && hasUnseen) {
      setHasUnseen(false);
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
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Notificações</h4>
            <p className="text-sm text-muted-foreground">
              Você tem {urgentTasks.length} tarefa(s) precisando de atenção.
            </p>
          </div>
          <div className="grid gap-2">
            {urgentTasks.length > 0 ? (
              urgentTasks.slice(0, 5).map(task => (
                <div key={task.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Venceu {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">Nenhuma notificação nova.</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
