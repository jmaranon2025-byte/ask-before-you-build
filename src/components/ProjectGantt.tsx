import React, { useState, useEffect, useMemo } from 'react';
import { Download, Plus, UserCircle, X, List, LayoutGrid, Trash2, Edit, MoreVertical, Calendar as CalendarIcon, ChevronLeft, ChevronRight, GanttChartSquare, Users, Link2, Unlink } from 'lucide-react';
import { Task, Project, Priority, User } from '@/types';

interface ProjectGanttProps {
  projects: Project[];
  tasks: Task[];
  users: User[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  phases: string[];
  taskStatuses: string[];
}

type ViewMode = 'list' | 'board' | 'calendar' | 'gantt' | 'team';

const ProjectGantt: React.FC<ProjectGanttProps> = ({
    projects, tasks, users, 
    onAddTask, onUpdateTask, onDeleteTask,
    phases, taskStatuses
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const [taskForm, setTaskForm] = useState<Partial<Task>>({
    name: '',
    phase: phases[0] as any,
    startDate: new Date().toISOString().split('T')[0],
    duration: 1,
    priority: Priority.MEDIA,
    progress: 0,
    status: 'Pendiente',
    assignedTo: '',
    dependencies: []
  });

  useEffect(() => {
    const projectExists = projects.find(p => p.id === selectedProjectId);
    if ((!selectedProjectId || !projectExists) && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    } else if (projects.length === 0) {
      setSelectedProjectId('');
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);

  // Group tasks by phase
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    phases.forEach(phase => {
      const phaseTasks = projectTasks.filter(t => t.phase === phase);
      if (phaseTasks.length > 0) {
        grouped[phase] = phaseTasks;
      }
    });
    return grouped;
  }, [projectTasks, phases]);

  const getAssigneeName = (userId: string) => users.find(u => u.id === userId)?.name || 'Sin asignar';

  const openNewTaskModal = () => {
    setEditingTask(null);
    setTaskForm({
      name: '',
      phase: phases[0] as any,
      startDate: new Date().toISOString().split('T')[0],
      duration: 1,
      priority: Priority.MEDIA,
      progress: 0,
      status: taskStatuses[0] as any,
      assignedTo: users[0]?.id || '',
      dependencies: []
    });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({ ...task });
    setIsTaskModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      setTaskToDelete(task);
      setActiveMenuId(null);
  };

  const confirmDelete = () => { 
      if (taskToDelete) { 
          onDeleteTask(taskToDelete.id); 
          setTaskToDelete(null); 
      } 
  };
  
  const handleMenuClick = (e: React.MouseEvent, taskId: string) => { 
    e.stopPropagation(); 
    setActiveMenuId(activeMenuId === taskId ? null : taskId); 
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !taskForm.name) return;
    const safeDuration = Math.max(1, Number(taskForm.duration) || 1);
    const safeProgress = Math.min(100, Math.max(0, Number(taskForm.progress) || 0));

    if (editingTask) {
        const updated: Task = {
            ...editingTask,
            name: taskForm.name,
            phase: taskForm.phase || editingTask.phase,
            startDate: taskForm.startDate || editingTask.startDate,
            duration: safeDuration,
            progress: safeProgress,
            status: taskForm.status as any,
            priority: taskForm.priority || editingTask.priority,
            assignedTo: taskForm.assignedTo || editingTask.assignedTo,
            dependencies: taskForm.dependencies || []
        };
        onUpdateTask(updated);
    } else {
        const newTask: Task = {
            id: `t-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            projectId: currentProject.id,
            name: taskForm.name!,
            phase: taskForm.phase || phases[0] as any,
            assignedTo: taskForm.assignedTo || users[0]?.id || 'u1',
            startDate: taskForm.startDate!,
            duration: safeDuration,
            progress: safeProgress,
            status: taskForm.status as any || 'Pendiente',
            dependencies: taskForm.dependencies || [],
            priority: taskForm.priority || Priority.MEDIA,
        };
        onAddTask(newTask);
    }
    setIsTaskModalOpen(false);
  };

  const downloadExcel = () => {
    if (!currentProject) return;
    const headers = ['Fase', 'Tarea', 'Prioridad', 'Responsable', 'Fecha Inicio', 'Duración', 'Estado'];
    const rows = projectTasks.map(t => [t.phase, t.name, t.priority, getAssigneeName(t.assignedTo), t.startDate, t.duration + 'd', t.status]);
    
    // Create CSV with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + headers.join('\t') + '\n' + rows.map(e => e.join('\t')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tareas-${currentProject.name.replace(/\s+/g, '-')}.xls`;
    link.click();
  };

  const getStatusColorClass = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('completado')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      if (s.includes('riesgo')) return 'bg-red-100 text-red-700 border-red-200';
      if (s.includes('progreso')) return 'bg-blue-100 text-blue-700 border-blue-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const renderListView = () => (
    <div className="overflow-auto flex-1 pb-32">
      {Object.keys(tasksByPhase).length > 0 ? (
        <div className="divide-y divide-slate-200">
          {Object.entries(tasksByPhase).map(([phase, phaseTasks], phaseIndex) => (
            <div key={phase}>
              {/* Phase Header */}
              <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 text-sm uppercase tracking-wide sticky top-0 z-10 border-b border-slate-200">
                {phaseIndex + 1}. {phase}
              </div>
              {/* Phase Tasks */}
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="p-4 border-b border-slate-200 w-1/3">Tarea</th>
                    <th className="p-4 border-b border-slate-200">Prioridad</th>
                    <th className="p-4 border-b border-slate-200">Responsable</th>
                    <th className="p-4 border-b border-slate-200">Cronograma</th>
                    <th className="p-4 border-b border-slate-200 text-center">Estado</th>
                    <th className="p-4 border-b border-slate-200 text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {phaseTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{task.name}</div>
                        {task.dependencies && task.dependencies.length > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">Dep: {task.dependencies.length}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          task.priority === Priority.CRITICA ? 'bg-red-50 text-red-700 border-red-100' :
                          task.priority === Priority.ALTA ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          task.priority === Priority.MEDIA ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>{task.priority}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <UserCircle className="w-5 h-5 text-slate-300" />
                          <span className="text-slate-700 text-xs">{getAssigneeName(task.assignedTo)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-full max-w-xs">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{task.startDate}</span>
                            <span>{task.duration}d</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${task.status === 'Completado' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${task.progress}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColorClass(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4 text-right relative">
                        <button onClick={(e) => handleMenuClick(e, task.id)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenuId === task.id && (
                          <div className="absolute right-8 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 text-left">
                            <button onClick={() => openEditTaskModal(task)} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                              <Edit className="w-3.5 h-3.5 mr-2 text-blue-500" /> Editar
                            </button>
                            <button onClick={(e) => handleDeleteClick(e, task)} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">Sin tareas registradas.</div>
      )}
    </div>
  );

  const renderBoardView = () => (
    <div className="flex-1 overflow-x-auto p-4 flex space-x-4 bg-slate-100/50 h-full">
      {taskStatuses.map(status => {
        const columnTasks = projectTasks.filter(t => t.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-80 flex flex-col bg-slate-50 rounded-xl border border-slate-200 h-full max-h-full">
            <div className={`p-3 border-b border-slate-200 font-bold text-sm flex justify-between items-center ${getStatusColorClass(status)}`}>
              <span>{status}</span>
              <span className="bg-white px-2 py-0.5 rounded text-xs border border-slate-200">{columnTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {columnTasks.map(task => (
                <div key={task.id} onClick={() => openEditTaskModal(task)} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md">
                  <h4 className="font-medium text-slate-800 mb-3">{task.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{getAssigneeName(task.assignedTo).split(' ')[0]}</span>
                    <span className="text-xs text-slate-400">{task.duration}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCalendarView = () => {
    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(currentYear, currentMonth, i + 1)));

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return (
      <div className="flex-1 flex flex-col bg-slate-50 p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {calendarDate.toLocaleString('es', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex space-x-2">
            <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))} className="p-2 hover:bg-slate-200 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200">Hoy</button>
            <button onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))} className="p-2 hover:bg-slate-200 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-slate-100/50 rounded min-h-[80px]"></div>;
            
            const dateStr = formatDate(day);
            const dayTasks = projectTasks.filter(t => t.startDate === dateStr);

            return (
              <div key={dateStr} className="bg-white border border-slate-100 rounded-lg p-1 min-h-[80px] overflow-hidden">
                <div className="text-xs font-bold mb-1 text-slate-500">{day.getDate()}</div>
                <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} onClick={() => openEditTaskModal(t)} className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer ${getStatusColorClass(t.status)}`}>
                      {t.name}
                    </div>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[9px] text-slate-400 text-center">+{dayTasks.length - 3} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Proyecto</h1>
          <p className="text-slate-500 text-sm">Gestiona las tareas de tus proyectos</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={downloadExcel} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button onClick={openNewTaskModal} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
            <Plus className="w-5 h-5" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Project Selector & View Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[280px]"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {currentProject && (
            <p className="text-sm text-slate-500 hidden md:block">
              Gestiona las tareas de: <span className="font-medium text-slate-700">{currentProject.name}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Lista"><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('board')} className={`p-2 rounded ${viewMode === 'board' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Tablero"><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('gantt')} className={`p-2 rounded ${viewMode === 'gantt' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Gantt"><GanttChartSquare className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('calendar')} className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Calendario"><CalendarIcon className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('team')} className={`p-2 rounded ${viewMode === 'team' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Equipo"><Users className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {!currentProject ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Selecciona un proyecto</div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'board' && renderBoardView()}
            {viewMode === 'calendar' && renderCalendarView()}
            {viewMode === 'gantt' && (
              <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
                <div className="text-center">
                  <GanttChartSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-slate-600">Vista Gantt</p>
                  <p className="text-sm">Próximamente - Visualización de cronograma interactivo</p>
                </div>
              </div>
            )}
            {viewMode === 'team' && (
              <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-slate-600">Vista Equipo</p>
                  <p className="text-sm">Próximamente - Distribución de tareas por miembro</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.name} onChange={e => setTaskForm({...taskForm, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fase</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.phase as string} onChange={e => setTaskForm({...taskForm, phase: e.target.value as any})}>
                    {phases.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                  <input type="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.startDate} onChange={e => setTaskForm({...taskForm, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duración (días)</label>
                  <input type="number" min="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.duration} onChange={e => setTaskForm({...taskForm, duration: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.status as string} onChange={e => setTaskForm({...taskForm, status: e.target.value as any})}>
                    {taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as Priority})}>
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Dependencies Section */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Dependencias
                </label>
                
                {/* Current Dependencies */}
                {taskForm.dependencies && taskForm.dependencies.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {taskForm.dependencies.map(depId => {
                      const depTask = projectTasks.find(t => t.id === depId);
                      return depTask ? (
                        <div key={depId} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{depTask.name}</p>
                            <p className="text-xs text-slate-500">{depTask.phase}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTaskForm({
                              ...taskForm,
                              dependencies: taskForm.dependencies?.filter(id => id !== depId) || []
                            })}
                            className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Quitar dependencia"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Add New Dependency */}
                {(() => {
                  const availableTasks = projectTasks.filter(t => 
                    t.id !== editingTask?.id && 
                    !taskForm.dependencies?.includes(t.id)
                  );
                  
                  if (availableTasks.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic">
                        {projectTasks.length <= 1 
                          ? 'No hay otras tareas disponibles para crear dependencias.'
                          : 'Todas las tareas ya están vinculadas como dependencias.'}
                      </p>
                    );
                  }

                  return (
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      value=""
                      onChange={e => {
                        if (e.target.value) {
                          setTaskForm({
                            ...taskForm,
                            dependencies: [...(taskForm.dependencies || []), e.target.value]
                          });
                        }
                      }}
                    >
                      <option value="">+ Agregar dependencia...</option>
                      {availableTasks.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.phase})
                        </option>
                      ))}
                    </select>
                  );
                })()}

                <p className="text-xs text-slate-500 mt-2">
                  Las dependencias indican qué tareas deben completarse antes de iniciar esta.
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md">{editingTask ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar Tarea?</h3>
            <p className="text-sm text-slate-500 mb-6">Se eliminará <strong>{taskToDelete.name}</strong>.</p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setTaskToDelete(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectGantt;
