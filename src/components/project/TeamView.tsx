import React, { useMemo } from 'react';
import { Task, User, Priority } from '@/types';
import { UserCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface TeamViewProps {
  tasks: Task[];
  users: User[];
  onEditTask: (task: Task) => void;
}

const TeamView: React.FC<TeamViewProps> = ({ tasks, users, onEditTask }) => {
  // Group tasks by assignee
  const tasksByUser = useMemo(() => {
    const grouped: Map<string, { user: User | null; tasks: Task[] }> = new Map();
    
    // Initialize with all users
    users.forEach(user => {
      grouped.set(user.id, { user, tasks: [] });
    });
    
    // Add unassigned bucket
    grouped.set('unassigned', { user: null, tasks: [] });
    
    // Distribute tasks
    tasks.forEach(task => {
      const userId = task.assignedTo || 'unassigned';
      if (grouped.has(userId)) {
        grouped.get(userId)!.tasks.push(task);
      } else {
        grouped.get('unassigned')!.tasks.push(task);
      }
    });
    
    // Remove empty users and sort by task count
    const result = Array.from(grouped.entries())
      .filter(([_, data]) => data.tasks.length > 0)
      .sort((a, b) => b[1].tasks.length - a[1].tasks.length);
    
    return result;
  }, [tasks, users]);

  const getStatusColorClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('completado')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('riesgo')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('progreso')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getPriorityColorClass = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICA: return 'bg-red-50 text-red-700 border-red-100';
      case Priority.ALTA: return 'bg-orange-50 text-orange-700 border-orange-100';
      case Priority.MEDIA: return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getTaskStats = (userTasks: Task[]) => {
    const completed = userTasks.filter(t => t.status?.toLowerCase().includes('completado')).length;
    const inProgress = userTasks.filter(t => t.status?.toLowerCase().includes('progreso')).length;
    const atRisk = userTasks.filter(t => t.status?.toLowerCase().includes('riesgo')).length;
    const pending = userTasks.length - completed - inProgress - atRisk;
    
    const totalHours = userTasks.reduce((sum, t) => sum + ((t.duration || 1) * 8), 0);
    
    return { completed, inProgress, atRisk, pending, totalHours };
  };

  if (tasksByUser.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <div className="text-center">
          <UserCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="font-medium text-slate-600">Sin tareas asignadas</p>
          <p className="text-sm">Asigna tareas a miembros del equipo para ver la distribución</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tasksByUser.map(([userId, { user, tasks: userTasks }]) => {
          const stats = getTaskStats(userTasks);
          
          return (
            <div key={userId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {/* User Header */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <UserCircle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">
                      {user?.name || 'Sin Asignar'}
                    </h3>
                    <p className="text-xs text-slate-500">{user?.role || 'Tareas pendientes de asignación'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-700">{userTasks.length}</span>
                    <p className="text-[10px] text-slate-500 uppercase">Tareas</p>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-3 mt-3 text-xs">
                  {stats.completed > 0 && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{stats.completed}</span>
                    </div>
                  )}
                  {stats.inProgress > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Clock className="w-3 h-3" />
                      <span>{stats.inProgress}</span>
                    </div>
                  )}
                  {stats.atRisk > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{stats.atRisk}</span>
                    </div>
                  )}
                  <div className="flex-1" />
                  <span className="text-slate-500">{stats.totalHours}h estimadas</span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {userTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{task.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{task.phase}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${getPriorityColorClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColorClass(task.status)}`}>
                        {task.status}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{task.startDate}</span>
                        <span className="text-slate-300">•</span>
                        <span>{task.duration}d</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            task.status?.toLowerCase().includes('completado') ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Workload Summary */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Carga de trabajo</span>
                  <div className="flex items-center gap-1">
                    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          stats.totalHours > 60 ? 'bg-red-500' : 
                          stats.totalHours > 40 ? 'bg-amber-500' : 
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (stats.totalHours / 80) * 100)}%` }}
                      />
                    </div>
                    <span className={`font-medium ${
                      stats.totalHours > 60 ? 'text-red-600' : 
                      stats.totalHours > 40 ? 'text-amber-600' : 
                      'text-emerald-600'
                    }`}>
                      {stats.totalHours}h
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamView;
