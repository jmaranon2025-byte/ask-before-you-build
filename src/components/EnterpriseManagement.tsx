import React, { useState, useEffect } from 'react';
import { Task, User, Priority } from '@/types';
import { Briefcase, Plus, List, LayoutGrid, Calendar as CalendarIcon, UserCircle, X, Edit, Trash2, MoreVertical, ChevronLeft, ChevronRight, FolderPlus, CornerDownRight, AlertOctagon } from 'lucide-react';

interface EnterpriseManagementProps {
  tasks: Task[];
  users: User[];
  departments: string[];
  taskStatuses: string[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

type TaskWithLevel = Task & { level: number };

const EnterpriseManagement: React.FC<EnterpriseManagementProps> = ({ 
    tasks, users, departments, taskStatuses, 
    onAddTask, onUpdateTask, onDeleteTask 
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
      if ((!selectedDept || !departments.includes(selectedDept)) && departments.length > 0) {
          setSelectedDept(departments[0]);
      }
  }, [departments, selectedDept]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const rawFilteredTasks = tasks.filter(t => 
      t.isEnterprise === true && 
      (t.department === selectedDept || (!t.department && selectedDept === 'General'))
  );

  const getOrganizedTasks = (): TaskWithLevel[] => {
      const organized: TaskWithLevel[] = [];
      const processedIds = new Set<string>();

      const roots = rawFilteredTasks.filter(t => {
         if (!t.parentId) return true;
         const parentInView = rawFilteredTasks.find(pt => pt.id === t.parentId);
         return !parentInView; 
      });

      const addNode = (task: Task, level: number) => {
          if (processedIds.has(task.id)) return;
          organized.push({ ...task, level });
          processedIds.add(task.id);
          
          const children = rawFilteredTasks.filter(t => t.parentId === task.id);
          children.forEach(c => addNode(c, level + 1));
      };

      roots.forEach(t => addNode(t, 0));
      
      rawFilteredTasks.forEach(t => {
          if (!processedIds.has(t.id)) organized.push({ ...t, level: 0 });
      });

      return organized;
  };

  const displayTasks = viewMode === 'list' ? getOrganizedTasks() : rawFilteredTasks as TaskWithLevel[];

  const [taskForm, setTaskForm] = useState<Partial<Task>>({
      name: '',
      department: '',
      assignedTo: '',
      startDate: new Date().toISOString().split('T')[0],
      duration: 1,
      priority: Priority.MEDIA,
      status: taskStatuses[0] as any,
      parentId: undefined
  });

  const openNewTaskModal = () => {
      setEditingTask(null);
      setTaskForm({
          name: '',
          department: selectedDept,
          assignedTo: users[0]?.id || '',
          startDate: new Date().toISOString().split('T')[0],
          duration: 1,
          priority: Priority.MEDIA,
          status: taskStatuses[0] as any,
          parentId: undefined
      });
      setIsTaskModalOpen(true);
  };

  const openSubtaskModal = (parent: Task) => {
      setEditingTask(null);
      setTaskForm({
          name: '',
          department: selectedDept,
          assignedTo: parent.assignedTo || '',
          startDate: parent.startDate,
          duration: 1,
          priority: parent.priority,
          status: taskStatuses[0] as any,
          parentId: parent.id
      });
      setIsTaskModalOpen(true);
      setActiveMenuId(null);
  };

  const openEditTaskModal = (task: Task) => {
      setEditingTask(task);
      setTaskForm({ ...task });
      setIsTaskModalOpen(true);
      setActiveMenuId(null);
  };

  const handleMenuClick = (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      setActiveMenuId(activeMenuId === taskId ? null : taskId);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!taskForm.name) return;
      
      const safeDuration = Math.max(1, Number(taskForm.duration) || 1);

      if (editingTask) {
          onUpdateTask({
              ...editingTask,
              ...taskForm as Task,
              duration: safeDuration,
              isEnterprise: true 
          });
      } else {
          onAddTask({
              id: `ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              projectId: '', 
              name: taskForm.name!,
              phase: 'General',
              assignedTo: taskForm.assignedTo || '',
              startDate: taskForm.startDate!,
              duration: safeDuration,
              progress: 0,
              status: taskForm.status as any,
              dependencies: [],
              priority: taskForm.priority || Priority.MEDIA,
              isEnterprise: true,
              department: selectedDept,
              parentId: taskForm.parentId
          });
      }
      setIsTaskModalOpen(false);
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

  const getStatusColorClass = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('completado') || s.includes('finalizado')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      if (s.includes('riesgo') || s.includes('atrasado') || s.includes('error')) return 'bg-red-100 text-red-700 border-red-200';
      if (s.includes('progreso') || s.includes('curso') || s.includes('ejecución')) return 'bg-blue-100 text-blue-700 border-blue-200';
      if (s.includes('cancelado')) return 'bg-orange-100 text-orange-800 border-orange-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getStatusBarColor = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('completado')) return 'bg-emerald-500';
      if (s.includes('riesgo')) return 'bg-red-500';
      if (s.includes('progreso')) return 'bg-blue-500';
      if (s.includes('cancelado')) return 'bg-orange-400';
      return 'bg-slate-400';
  };

  const renderListView = () => (
      <div className="overflow-auto flex-1 pb-20">
          <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold shadow-sm">
                  <tr>
                      <th className="p-4 border-b border-slate-200 w-1/3">Tarea</th>
                      <th className="p-4 border-b border-slate-200">Prioridad</th>
                      <th className="p-4 border-b border-slate-200">Responsable</th>
                      <th className="p-4 border-b border-slate-200 w-48">Cronograma</th>
                      <th className="p-4 border-b border-slate-200 text-center">Estado</th>
                      <th className="p-4 border-b border-slate-200 w-16"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                  {displayTasks.length > 0 ? displayTasks.map(task => {
                      const level = task.level || 0;
                      const indentSize = level * 24; 
                      const isParent = tasks.some(t => t.parentId === task.id);

                      return (
                        <tr key={task.id} className={`hover:bg-slate-50 group ${isParent ? 'bg-slate-50/30' : ''}`}>
                            <td className="p-4 cursor-pointer" onClick={() => openEditTaskModal(task)}>
                                <div className="flex items-center" style={{ paddingLeft: `${indentSize}px` }}>
                                    {level > 0 && <CornerDownRight className="w-4 h-4 text-slate-300 mr-2 flex-shrink-0" />}
                                    <div className="flex-1">
                                        <div className={`font-medium ${isParent ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                                            {task.name}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                                    task.priority === Priority.CRITICA ? 'bg-red-50 text-red-700 border-red-100' :
                                    task.priority === Priority.ALTA ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                    task.priority === Priority.MEDIA ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>{task.priority}</span>
                            </td>
                            <td className="p-4 text-slate-600">
                                <div className="flex items-center gap-2">
                                    <UserCircle className="w-4 h-4 text-slate-300" />
                                    <span className="truncate max-w-[120px]">{users.find(u => u.id === task.assignedTo)?.name || 'Sin Asignar'}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="w-full max-w-xs">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>{task.startDate}</span>
                                        <span className={isParent ? "font-bold text-indigo-600" : ""}>{task.duration}d</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${getStatusBarColor(task.status)}`} 
                                            style={{ width: task.status === 'Completado' ? '100%' : `${Math.max(5, task.progress || 0)}%` }} 
                                        />
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColorClass(task.status)}`}>
                                    {task.status}
                                </span>
                            </td>
                            <td className="p-4 text-right relative">
                                <button 
                                    onClick={(e) => handleMenuClick(e, task.id)} 
                                    className={`p-1.5 rounded-full transition-colors ${activeMenuId === task.id ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {activeMenuId === task.id && (
                                    <div className="absolute right-8 top-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 animate-fade-in py-1 text-left">
                                        <button onClick={() => openEditTaskModal(task)} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Edit className="w-4 h-4 mr-2 text-blue-500" /> Editar
                                        </button>
                                        <button onClick={() => openSubtaskModal(task)} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                                            <FolderPlus className="w-4 h-4 mr-2 text-emerald-500" /> Agregar Subtarea
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button onClick={(e) => handleDeleteClick(e, task)} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                      );
                  }) : (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay tareas en este departamento.</td></tr>
                  )}
              </tbody>
          </table>
      </div>
  );

  const renderBoardView = () => (
      <div className="flex-1 overflow-x-auto p-4 flex space-x-4 bg-slate-100/50">
          {taskStatuses.map(status => {
              const colTasks = rawFilteredTasks.filter(t => t.status === status);
              return (
                  <div key={status} className="flex-shrink-0 w-80 flex flex-col bg-slate-50 rounded-xl border border-slate-200 h-full max-h-full">
                      <div className={`p-3 border-b border-slate-200 font-bold text-sm flex justify-between items-center rounded-t-xl ${getStatusColorClass(status)} bg-opacity-30`}>
                          <span>{status}</span>
                          <span className="bg-white px-2 py-0.5 rounded text-xs border border-slate-200 shadow-sm">{colTasks.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {colTasks.map(task => (
                              <div key={task.id} onClick={() => openEditTaskModal(task)} className="bg-white p-3 rounded shadow-sm border border-slate-200 cursor-pointer hover:shadow-md">
                                  <div className="flex justify-between mb-2">
                                      <span className={`text-[10px] px-1 rounded ${
                                          task.priority === Priority.CRITICA ? 'bg-red-100 text-red-700' : 'bg-slate-100'
                                      }`}>{task.priority}</span>
                                  </div>
                                  <div className="font-medium text-sm mb-2">{task.name}</div>
                                  <div className="flex items-center justify-between mt-2">
                                      <div className="text-xs text-slate-500 flex items-center">
                                          <CalendarIcon className="w-3 h-3 mr-1" />
                                          {task.startDate}
                                      </div>
                                      <div className={`h-1.5 w-12 rounded-full ${getStatusBarColor(task.status)}`} />
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

      const prevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
      const nextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
      const today = () => setCalendarDate(new Date());

      const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(currentYear, currentMonth, i + 1)));

      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const hierarchicalTasks = getOrganizedTasks();

      return (
          <div className="flex-1 flex flex-col bg-slate-50 p-4 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">
                      {calendarDate.toLocaleString('es', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex space-x-2">
                      <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                      <button onClick={today} className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200">Hoy</button>
                      <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                  </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto">
                  {days.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="bg-slate-100/50 rounded min-h-[80px]"></div>;
                      
                      const dateStr = formatDate(day);
                      const dayTasks = hierarchicalTasks.filter(t => t.startDate === dateStr);
                      const isToday = dateStr === formatDate(new Date());

                      return (
                          <div key={dateStr} className={`bg-white border border-slate-100 rounded-lg p-1 min-h-[80px] overflow-hidden ${isToday ? 'ring-2 ring-indigo-500' : ''}`}>
                              <div className={`text-xs font-bold mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                                  {day.getDate()}
                              </div>
                              <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
                                  {dayTasks.slice(0, 3).map(t => (
                                      <div 
                                          key={t.id}
                                          onClick={() => openEditTaskModal(t)}
                                          className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer ${getStatusColorClass(t.status)}`}
                                          title={t.name}
                                      >
                                          {t.name}
                                      </div>
                                  ))}
                                  {dayTasks.length > 3 && (
                                      <div className="text-[9px] text-slate-400 text-center">+{dayTasks.length - 3} más</div>
                                  )}
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
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Briefcase className="w-6 h-6 mr-2 text-indigo-600" />
            Gestión Empresarial
          </h1>
          <p className="text-slate-500 text-sm">Tareas internas por departamento</p>
        </div>
        <button 
          onClick={openNewTaskModal}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
              {departments.map(dept => (
                  <button 
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDept === dept 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                      {dept}
                  </button>
              ))}
          </div>
          
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Lista">
                  <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('board')} className={`p-2 rounded ${viewMode === 'board' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Tablero">
                  <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('calendar')} className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`} title="Vista Calendario">
                  <CalendarIcon className="w-4 h-4" />
              </button>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {viewMode === 'list' && renderListView()}
          {viewMode === 'board' && renderBoardView()}
          {viewMode === 'calendar' && renderCalendarView()}
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{editingTask ? 'Editar Tarea' : 'Nueva Tarea Empresarial'}</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Tarea</label>
                <input 
                  type="text" required
                  placeholder="Descripción de la actividad"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={taskForm.name}
                  onChange={e => setTaskForm({...taskForm, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={taskForm.assignedTo}
                    onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={taskForm.priority}
                    onChange={e => setTaskForm({...taskForm, priority: e.target.value as Priority})}
                  >
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                  <input 
                    type="date" required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={taskForm.startDate}
                    onChange={e => setTaskForm({...taskForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duración (días)</label>
                  <input 
                    type="number" min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={taskForm.duration}
                    onChange={e => setTaskForm({...taskForm, duration: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={taskForm.status as string}
                  onChange={e => setTaskForm({...taskForm, status: e.target.value as any})}
                >
                  {taskStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {taskForm.parentId && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-sm text-indigo-700">
                    <FolderPlus className="w-4 h-4 inline mr-2" />
                    Esta será una subtarea anidada.
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-colors"
                >
                  {editingTask ? 'Actualizar' : 'Crear Tarea'}
                </button>
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
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar Tarea?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Se eliminará <strong>{taskToDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseManagement;
