import React, { useMemo } from 'react';
import { Task, User, Priority } from '@/types';
import { ChevronLeft, ChevronRight, UserCircle } from 'lucide-react';

interface GanttViewProps {
  tasks: Task[];
  users: User[];
  phases: string[];
  onEditTask: (task: Task) => void;
}

const GanttView: React.FC<GanttViewProps> = ({ tasks, users, phases, onEditTask }) => {
  const [viewOffset, setViewOffset] = React.useState(0);
  
  const getAssigneeName = (userId: string) => users.find(u => u.id === userId)?.name || 'Sin asignar';

  // Calculate date range
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: today,
        end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        days: 30
      };
    }

    const dates = tasks.map(t => new Date(t.startDate));
    const endDates = tasks.map(t => {
      const start = new Date(t.startDate);
      return new Date(start.getTime() + (t.duration || 1) * 24 * 60 * 60 * 1000);
    });

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 5);

    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return { start: minDate, end: maxDate, days: Math.max(days, 14) };
  }, [tasks]);

  // Generate visible days (show 28 days at a time)
  const visibleDays = useMemo(() => {
    const days: Date[] = [];
    const startOffset = new Date(dateRange.start);
    startOffset.setDate(startOffset.getDate() + viewOffset);
    
    for (let i = 0; i < 28; i++) {
      const day = new Date(startOffset);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [dateRange.start, viewOffset]);

  // Group days by week
  const weeks = useMemo(() => {
    const weekMap: Map<string, Date[]> = new Map();
    visibleDays.forEach(day => {
      const weekStart = new Date(day);
      weekStart.setDate(day.getDate() - day.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(day);
    });
    return Array.from(weekMap.entries());
  }, [visibleDays]);

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getBarPosition = (task: Task) => {
    const taskStart = new Date(task.startDate);
    const viewStart = visibleDays[0];
    const dayWidth = 32; // Width of each day column in pixels
    
    const startDiff = Math.floor((taskStart.getTime() - viewStart.getTime()) / (24 * 60 * 60 * 1000));
    const left = startDiff * dayWidth;
    const width = Math.max((task.duration || 1) * dayWidth - 4, dayWidth - 4);
    
    return { left, width, visible: startDiff >= -task.duration && startDiff < 28 };
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICA: return 'bg-red-500';
      case Priority.ALTA: return 'bg-orange-500';
      case Priority.MEDIA: return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('completado')) return 'bg-emerald-500';
    if (s.includes('riesgo')) return 'bg-red-500';
    if (s.includes('progreso')) return 'bg-blue-500';
    return 'bg-slate-400';
  };

  // Group tasks by phase
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    phases.forEach(phase => {
      const phaseTasks = tasks.filter(t => t.phase === phase);
      if (phaseTasks.length > 0) {
        grouped[phase] = phaseTasks;
      }
    });
    return grouped;
  }, [tasks, phases]);

  const today = formatDate(new Date());

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <div className="text-center">
          <p className="font-medium text-slate-600">Sin tareas</p>
          <p className="text-sm">Agrega tareas para ver el diagrama de Gantt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Navigation Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewOffset(prev => prev - 7)}
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewOffset(0)}
            className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded font-medium hover:bg-indigo-200 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => setViewOffset(prev => prev + 7)}
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-slate-600">
          {visibleDays[0]?.toLocaleDateString('es', { month: 'short', year: 'numeric' })} - {visibleDays[visibleDays.length - 1]?.toLocaleDateString('es', { month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex sticky top-0 z-10 bg-white border-b border-slate-200">
            {/* Task info column header */}
            <div className="w-64 flex-shrink-0 px-4 py-2 bg-slate-100 border-r border-slate-200">
              <span className="text-xs font-semibold text-slate-600 uppercase">Tarea</span>
            </div>
            
            {/* Days header */}
            <div className="flex">
              {visibleDays.map((day, idx) => {
                const isToday = formatDate(day) === today;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <div
                    key={idx}
                    className={`w-8 flex-shrink-0 text-center py-2 border-r border-slate-100 ${
                      isToday ? 'bg-blue-100' : isWeekend ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400">
                      {day.toLocaleDateString('es', { weekday: 'short' }).charAt(0).toUpperCase()}
                    </div>
                    <div className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks by Phase */}
          {Object.entries(tasksByPhase).map(([phase, phaseTasks], phaseIdx) => (
            <div key={phase}>
              {/* Phase Header */}
              <div className="flex bg-slate-100 border-b border-slate-200">
                <div className="w-64 flex-shrink-0 px-4 py-2 font-semibold text-xs text-slate-700 uppercase tracking-wide border-r border-slate-200">
                  {phaseIdx + 1}. {phase}
                </div>
                <div className="flex-1" />
              </div>

              {/* Phase Tasks */}
              {phaseTasks.map((task) => {
                const barPos = getBarPosition(task);
                
                return (
                  <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    {/* Task Info */}
                    <div 
                      className="w-64 flex-shrink-0 px-4 py-2 border-r border-slate-200 cursor-pointer"
                      onClick={() => onEditTask(task)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                        <span className="text-sm text-slate-700 truncate font-medium">{task.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <UserCircle className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] text-slate-500">{getAssigneeName(task.assignedTo)}</span>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative flex">
                      {/* Background grid */}
                      {visibleDays.map((day, idx) => {
                        const isToday = formatDate(day) === today;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        
                        return (
                          <div
                            key={idx}
                            className={`w-8 h-12 flex-shrink-0 border-r border-slate-100 ${
                              isToday ? 'bg-blue-50' : isWeekend ? 'bg-slate-50/50' : ''
                            }`}
                          />
                        );
                      })}

                      {/* Task Bar */}
                      {barPos.visible && (
                        <div
                          className={`absolute top-2 h-8 rounded cursor-pointer transition-all hover:opacity-90 shadow-sm ${getStatusColor(task.status)}`}
                          style={{
                            left: `${barPos.left}px`,
                            width: `${barPos.width}px`,
                          }}
                          onClick={() => onEditTask(task)}
                        >
                          {/* Progress overlay */}
                          <div
                            className="absolute inset-0 bg-black/20 rounded-l"
                            style={{ width: `${task.progress}%` }}
                          />
                          {/* Label */}
                          {barPos.width > 60 && (
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-medium truncate">
                              {task.progress}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs">
        <span className="text-slate-500">Estados:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-400" />
          <span className="text-slate-600">Pendiente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-slate-600">En Progreso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-slate-600">En Riesgo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-slate-600">Completado</span>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
