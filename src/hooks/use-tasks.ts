
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';
import { StorageService } from '@/lib/storage-service';
import type { Task, AddTaskInput } from '@/lib/types/task-types';
import { 
    getTasks as getTasksFlow,
    addTask as addTaskFlow,
    updateTask as updateTaskFlow,
    deleteTask as deleteTaskFlow,
    getNotificationTasks as getNotificationTasksFlow,
} from '@/ai/flows/tasks-flow';


export type { Task, AddTaskInput };

const COLLECTION_KEY = 'tasks';

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
            // Using StorageService to abstract away the source
            const data = await StorageService.getCollection<Task>(COLLECTION_KEY);
            setTasks(data);
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
        const newTask = await StorageService.addItem(COLLECTION_KEY, taskData);
        await loadTasks();
        return newTask;
    };

    const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task | null> => {
        if (!user) throw new Error("User not authenticated");
        const updatedTask = await StorageService.updateItem(COLLECTION_KEY, taskId, updates);
        await loadTasks();
        return updatedTask;
    };

    const deleteTask = async (taskId: string) => {
        if (!user) throw new Error("User not authenticated");
        await StorageService.deleteItem(COLLECTION_KEY, taskId);
        await loadTasks();
    };

    const getNotificationTasks = useCallback(async (): Promise<Task[]> => {
        if (!user) return [];
        // This should always call the flow directly, as it's a specific check
        return await getNotificationTasksFlow();
    }, [user]);

    return { tasks, isLoading, addTask, updateTask, deleteTask, getNotificationTasks, refreshTasks: loadTasks };
}
