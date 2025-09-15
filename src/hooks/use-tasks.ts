
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import type { Task, AddTaskInput } from '@/lib/types/task-types';
import { StorageService } from '@/lib/storage-service';
import { getNotificationTasks as getNotificationTasksFlow } from '@/ai/flows/tasks-flow';


export type { Task, AddTaskInput };


export function useTasks() {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadTasks = useCallback(async () => {
        if (!user) {
            setTasks([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await StorageService.getCollection<Task>('tasks');
            
            // Helper to build the hierarchy
            const buildHierarchy = (items: Task[]): Task[] => {
                const itemMap = new Map<string, Task>();
                items.forEach(item => itemMap.set(item.id, { ...item, subtasks: [] }));

                const rootItems: Task[] = [];
                items.forEach(item => {
                    if (item.parentId && itemMap.has(item.parentId)) {
                        const parent = itemMap.get(item.parentId)!;
                        parent.subtasks.push(itemMap.get(item.id)!);
                    } else {
                        rootItems.push(itemMap.get(item.id)!);
                    }
                });
                 // Sort root tasks by due date
                rootItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                return rootItems;
            };

            setTasks(buildHierarchy(data));
        } catch (error) {
            console.error("Failed to load tasks:", error);
            toast({
                title: 'Erro ao Carregar Tarefas',
                description: 'Não foi possível buscar os dados das tarefas.',
                variant: 'destructive',
            });
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!authLoading) {
            loadTasks();
        }
    }, [user, authLoading, loadTasks]);

    const addTask = async (taskData: AddTaskInput): Promise<Task> => {
        if (!user) throw new Error("User not authenticated");
        const newTask = await StorageService.addItem('tasks', taskData);
        await loadTasks();
        return newTask as Task;
    };

    const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'subtasks'>>): Promise<Task | null> => {
        if (!user) throw new Error("User not authenticated");
        const updatedTask = await StorageService.updateItem('tasks', taskId, updates);
        await loadTasks();
        return updatedTask as Task | null;
    };

    const deleteTask = async (taskId: string) => {
        if (!user) throw new Error("User not authenticated");
        await StorageService.deleteItem('tasks', taskId);
        await loadTasks();
    };
    
     const getNotificationTasks = useCallback(async (): Promise<Task[]> => {
        if (!user) return [];
        // This flow specifically hits the database regardless of the StorageService mode,
        // which is correct for a "server-side" check of what's due.
        return await getNotificationTasksFlow();
    }, [user]);

    return { tasks, isLoading, addTask, updateTask, deleteTask, getNotificationTasks, refreshTasks: loadTasks };
}
