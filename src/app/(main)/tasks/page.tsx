"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronRight, Check, List, Calendar as CalendarIconLucide } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks, Task } from '@/hooks/use-tasks';
import { useClients } from '@/hooks/use-clients';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from './calendar-view';


const emptyTask: Omit<Task, 'id' | 'status' | 'userId' | 'subtasks'> & { dueDate: Date } = {
    title: "",
    description: "",
    dueDate: new Date(),
    relatedClientId: null,
    parentId: null,
};


const TaskItem = ({ task, onEdit, onAddSubtask, onToggleComplete, onDelete, level = 0 }: { task: Task, onEdit: (task: Task) => void, onAddSubtask: (parentId: string) => void, onToggleComplete: (task: Task) => void, onDelete: (taskId: string) => void, level?: number }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const isOverdue = task.status !== 'Concluída' && new Date(task.dueDate) < new Date();

    return (
        <div style={{ marginLeft: `${level * 2}rem` }}>
            <div className="flex items-center gap-2 group py-2">
                {task.subtasks.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                    </Button>
                )}
                {task.subtasks.length === 0 && <div className="w-6 h-6" />}

                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleComplete(task)}>
                    <div className={cn("h-4 w-4 rounded-sm border border-primary flex items-center justify-center", task.status === 'Concluída' && "bg-primary")}>
                         {task.status === 'Concluída' && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                </Button>
                
                <span className={cn("flex-1 cursor-pointer", task.status === 'Concluída' && "line-through text-muted-foreground")} onClick={() => onEdit(task)}>
                    {task.title}
                </span>

                <span className={cn("text-xs", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                    {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                </span>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onAddSubtask(task.id)}>Adicionar Subtarefa</Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a tarefa {task.subtasks.length > 0 && "e todas as suas subtarefas"}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(task.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            {isExpanded && task.subtasks.map(subtask => (
                <TaskItem key={subtask.id} task={subtask} onEdit={onEdit} onAddSubtask={onAddSubtask} onToggleComplete={onToggleComplete} onDelete={onDelete} level={level + 1} />
            ))}
        </div>
    );
}

export default function TasksPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { tasks, isLoading, addTask, updateTask, deleteTask } = useTasks();
    const { clients, isLoading: clientsLoading } = useClients();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Omit<Task, 'id' | 'subtasks'> | Task>(emptyTask as Omit<Task, 'id' | 'subtasks'>);
    const [view, setView] = useState<'list' | 'calendar'>('list');


    const handleDueDateChange = (date: Date | undefined) => {
        if (date) {
            setCurrentTask(prev => ({ ...prev, dueDate: date }));
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setCurrentTask(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSelectChange = (id: 'status' | 'relatedClientId', value: string) => {
        const finalValue = value === 'none' ? null : value;
        setCurrentTask(prev => ({ ...prev, [id]: finalValue }));
    };


    const handleSaveTask = async () => {
        if (!currentTask.title) {
            toast({ title: "Erro", description: "O título da tarefa é obrigatório.", variant: "destructive" });
            return;
        }

        try {
            const taskData = {
                ...currentTask,
                dueDate: (currentTask.dueDate as Date).toISOString(),
                userId: user?.email, // Associate task with the logged-in user
                status: 'id' in currentTask ? currentTask.status : 'Pendente',
            };
            
            const { subtasks, ...dataToSave } = taskData as Task; // Remove subtasks before saving

            if ('id' in currentTask) {
                const { id, ...updates } = dataToSave;
                await updateTask(id, updates);
                toast({ title: "Sucesso", description: "Tarefa atualizada com sucesso." });
            } else {
                await addTask(dataToSave as any);
                toast({ title: "Sucesso", description: "Tarefa adicionada com sucesso." });
            }
            setIsSheetOpen(false);
            setCurrentTask(emptyTask as Omit<Task, 'id' | 'subtasks'>);
        } catch (error) {
            console.error("Error saving task: ", error);
            toast({ title: "Erro", description: "Não foi possível salvar a tarefa.", variant: "destructive" });
        }
    };
    
    const handleToggleComplete = async (task: Task) => {
        const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
        try {
            await updateTask(task.id, { status: newStatus });
             toast({ title: "Status Atualizado", description: `Tarefa marcada como "${newStatus}".` });
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível atualizar a tarefa.", variant: "destructive" });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId);
            toast({ title: "Sucesso", description: "Tarefa excluída com sucesso." });
        } catch (error) {
            console.error("Error deleting task:", error);
            toast({ title: "Erro", description: "Não foi possível excluir a tarefa.", variant: "destructive" });
        }
    };

    const handleEditTask = (task: Task) => {
        setCurrentTask({ ...task, dueDate: new Date(task.dueDate) });
        setIsSheetOpen(true);
    };

    const handleAddSubtask = (parentId: string) => {
        setCurrentTask({
            ...emptyTask,
            parentId: parentId,
            dueDate: new Date(),
        } as Omit<Task, 'id' | 'subtasks'>);
        setIsSheetOpen(true);
    };
    
    const handleAddNew = () => {
         setCurrentTask(emptyTask as Omit<Task, 'id' | 'subtasks'>);
         setIsSheetOpen(true);
    }
    
    const rootTasks = useMemo(() => tasks.filter(task => !task.parentId), [tasks]);


    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
                    <p className="text-muted-foreground">Gerencie suas tarefas e visualize-as no calendário.</p>
                </div>
                 <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={handleAddNew}>
                    <PlusCircle className="h-4 w-4" />
                    Nova Tarefa
                </Button>
            </div>
            
             <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'calendar')}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="list">
                        <List className="mr-2 h-4 w-4" />
                        Lista
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                        Calendário
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="list">
                     <div className="p-4 sm:p-6 border rounded-lg mt-4">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-1/3" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-2/3" />
                            </div>
                        ) : rootTasks.length > 0 ? (
                             rootTasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task} 
                                    onEdit={handleEditTask} 
                                    onAddSubtask={handleAddSubtask}
                                    onToggleComplete={handleToggleComplete}
                                    onDelete={handleDeleteTask}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
                                <Button variant="ghost" className="mt-4" onClick={handleAddNew}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Crie sua primeira tarefa
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="calendar">
                     <div className="mt-4">
                        <CalendarView tasks={tasks} onTaskClick={handleEditTask} onNewTask={handleAddNew} />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Sheet for Adding/Editing Task */}
            <Sheet open={isSheetOpen} onOpenChange={(isOpen) => {
                setIsSheetOpen(isOpen);
                if (!isOpen) setCurrentTask(emptyTask as Omit<Task, 'id' | 'subtasks'>);
            }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{'id' in currentTask ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}</SheetTitle>
                        <SheetDescription>
                            Preencha os detalhes da tarefa. Clique em salvar quando terminar.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-6 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input id="title" value={currentTask.title} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea id="description" value={currentTask.description ?? ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Data de Vencimento</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !currentTask.dueDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {currentTask.dueDate ? format(currentTask.dueDate as Date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={currentTask.dueDate as Date}
                                    onSelect={handleDueDateChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={'id' in currentTask ? currentTask.status : 'Pendente'} onValueChange={(value) => handleSelectChange('status', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pendente">Pendente</SelectItem>
                                    <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                                    <SelectItem value="Concluída">Concluída</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="relatedClientId">Cliente Associado (Opcional)</Label>
                            <Select value={currentTask.relatedClientId ?? ''} onValueChange={(value) => handleSelectChange('relatedClientId', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <SheetFooter>
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTask}>Salvar Tarefa</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

        </div>
    );
}
