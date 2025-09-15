"use client";

import React, { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CornerDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
}

export function CalendarView({ tasks, onTaskClick, onNewTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = startOfToday();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [tasks]);

  const renderHeader = () => {
    const dateFormat = "EEEE";
    const days = [];
    let day = startDate;

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-semibold text-muted-foreground text-sm py-2 capitalize" key={i}>
          {format(day, dateFormat, { locale: ptBR })}
        </div>
      );
      day = addDays(day, 1);
    }
    return <div className="grid grid-cols-7">{days}</div>;
  };

  const renderCells = () => {
    const rows: JSX.Element[] = [];
    let days: JSX.Element[] = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const dateKey = format(day, 'yyyy-MM-dd');
        const tasksForDay = tasksByDate[dateKey] || [];
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            className={cn(
              "relative flex flex-col h-36 p-2 border-t border-l",
              isCurrentMonth ? "bg-card" : "bg-muted/50 text-muted-foreground",
              i === 6 ? "border-r" : "",
            )}
            key={day.toString()}
          >
            <span
              className={cn(
                "font-medium",
                isSameDay(day, today) && "flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground",
                !isCurrentMonth && "opacity-50"
              )}
            >
              {formattedDate}
            </span>
             <ScrollArea className="flex-1 mt-1">
                <div className="space-y-1 pr-2">
                    {tasksForDay.map(task => (
                    <Badge
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        variant={task.status === 'Concluída' ? 'secondary' : 'default'}
                        className={cn(
                            "w-full text-left justify-start truncate cursor-pointer flex items-center gap-1.5",
                            task.status !== 'Concluída' && isBefore(new Date(task.dueDate), today) && "bg-destructive text-destructive-foreground",
                        )}
                        >
                        {task.subtasks && task.subtasks.length > 0 && <CornerDownRight className="h-3 w-3 flex-shrink-0" />}
                        <span className="truncate">{task.title}</span>
                    </Badge>
                    ))}
                </div>
            </ScrollArea>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-b">{rows}</div>;
  };
  
    const changeMonth = (amount: number) => {
        setCurrentDate(addMonths(currentDate, amount));
    };


  return (
    <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-bold capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      {renderHeader()}
      {renderCells()}
    </div>
  );
}
