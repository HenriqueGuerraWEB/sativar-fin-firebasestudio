
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTasks, Task } from '@/hooks/use-tasks';
import { useClients } from '@/hooks/use-clients';
import { useAuth } from '@/hooks/use-auth';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';


const emptyTask: Omit<Task, 'id' | 'status' | 'userId'> & { dueDate: Date } = {
    title: "",
    description: "",
    dueDate: new Date(),
    relatedClientId: null,
};


export default function TasksPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { tasks, isLoading, addTask, updateTask, deleteTask } = useTasks();
    const { clients, isLoading: clientsLoading } = useClients();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Omit<Task, 'id'> | (Task & { dueDate: Date })>(emptyTask);
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

    const handleMonthChange = (month: Date) => {
        setCurrentMonth(startOfMonth(month));
    };

    const tasksForMonth = useMemo(() => {
        return tasks.filter(task => new Date(task.dueDate).getMonth() === currentMonth.getMonth() && new Date(task.dueDate).getFullYear() === currentMonth.getFullYear());
    }, [tasks, currentMonth]);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;
        setCurrentTask(emptyTask);
        setCurrentTask(prev => ({ ...prev, dueDate: date }));
        setIsSheetOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setCurrentTask(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSelectChange = (id: 'status' | 'relatedClientId', value: string) => {
        setCurrentTask(prev => ({ ...prev, [id]: value }));
    };

    const handleDueDateChange = (date: Date | undefined) => {
        if (date) {
            setCurrentTask(prev => ({ ...prev, dueDate: date }));
        }
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
            
            if ('id' in currentTask) {
                const { id, ...updates } = taskData;
                await updateTask(id, updates);
                toast({ title: "Sucesso", description: "Tarefa atualizada com sucesso." });
            } else {
                await addTask(taskData as any);
                toast({ title: "Sucesso", description: "Tarefa adicionada com sucesso." });
            }
            setIsSheetOpen(false);
            setCurrentTask(emptyTask);
        } catch (error) {
            console.error("Error saving task: ", error);
            toast({ title: "Erro", description: "Não foi possível salvar a tarefa.", variant: "destructive" });
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

    const DayContent = (props: { date: Date; displayMonth: Date }) => {
        const tasksOnDay = tasksForMonth.filter(task => isSameDay(new Date(task.dueDate), props.date));
        if (tasksOnDay.length === 0) return <div>{format(props.date, 'd')}</div>;

        return (
            <div className="relative h-full w-full">
                {format(props.date, 'd')}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-1">
                    {tasksOnDay.slice(0, 3).map(task => (
                        <div key={task.id} className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            task.status === 'Concluída' && 'bg-green-500',
                            task.status === 'Pendente' && 'bg-yellow-500',
                            task.status === 'Em Progresso' && 'bg-blue-500',
                        )} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
                    <p className="text-muted-foreground">Gerencie suas tarefas e visualize-as no calendário.</p>
                </div>
                <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={() => { setCurrentTask(emptyTask); setIsSheetOpen(true); }}>
                    <PlusCircle className="h-4 w-4" />
                    Nova Tarefa
                </Button>
            </div>
            
            <Card>
                <CardContent className="p-2 sm:p-4">
                     <style>{`
                        .rdp-day { height: 6rem; }
                        .rdp-day_selected { background-color: hsl(var(--accent)); }
                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: hsl(var(--accent)); }
                    `}</style>
                    <DayPicker
                        mode="single"
                        onSelect={handleDateSelect}
                        month={currentMonth}
                        onMonthChange={handleMonthChange}
                        locale={ptBR}
                        className="w-full"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4 w-full",
                            table: "w-full border-collapse",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        }}
                        components={{ DayContent }}
                    />
                </CardContent>
            </Card>

            {/* Sheet for Adding/Editing Task */}
            <Sheet open={isSheetOpen} onOpenChange={(isOpen) => {
                setIsSheetOpen(isOpen);
                if (!isOpen) setCurrentTask(emptyTask);
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
                                    {currentTask.dueDate ? format(currentTask.dueDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
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
                        {'id' in currentTask && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Tarefa
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Essa ação não pode ser desfeita. Isso excluirá permanentemente a tarefa.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            handleDeleteTask((currentTask as Task).id);
                                            setIsSheetOpen(false);
                                        }}>Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
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
