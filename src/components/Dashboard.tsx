import React, { useState, useMemo } from 'react';
import { ProjectStatus, Priority, Project, Task, User } from '@/types';
import { Activity, AlertTriangle, CheckCircle, Clock, Plus, X, Trash2, Filter, Eye, EyeOff } from 'lucide-react';

interface ProjectTemplateItem {
  name: string;
  phase: string;
  duration: number;
  offset: number;
  priority: string;
}

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  users: User[];
  onAddProject: (project: Project, tasks: Task[]) => void;
  onDeleteProject?: (projectId: string) => void;
  projectStatuses: string[];
  projectTemplate: ProjectTemplateItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
    projects, tasks, users, 
    onAddProject, onDeleteProject,
    projectStatuses, projectTemplate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [useTemplate, setUseTemplate] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    client: '',
    location: '',
    budget: undefined,
    capacityKW: undefined,
    startDate: new Date().toISOString().split('T')[0]
  });

  // KPI Calculations
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status !== 'Completado' && p.status !== 'Detenido');
  
  const efficiency = activeProjects.length > 0 
      ? Math.round(activeProjects.reduce((acc, curr) => acc + (curr.progress || 0), 0) / activeProjects.length) 
      : 0;

  const delayedTasks = tasks.filter(t => t.status === 'En Riesgo' || (new Date(t.startDate) < new Date() && t.status !== 'Completado' && t.status !== 'Cancelado')).length;
  const criticalTasks = tasks.filter(t => t.priority === Priority.CRITICA && t.status !== 'Completado' && t.status !== 'Cancelado').length;

  const filteredProjects = projects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (statusFilter !== 'Completado' && !showCompleted && p.status === 'Completado') return false;
      return true;
  });

  const getStatusColor = (status: string, type: 'bg' | 'text' | 'border' | 'solid-bg' = 'bg') => {
      const s = status.toLowerCase();
      if (s.includes('completado') || s.includes('finalizado')) {
          if (type === 'solid-bg') return 'bg-emerald-500';
          if (type === 'bg') return 'bg-emerald-100';
          if (type === 'text') return 'text-emerald-800';
          return 'border-emerald-200';
      }
      if (s.includes('riesgo') || s.includes('atrasado') || s.includes('error')) {
          if (type === 'solid-bg') return 'bg-red-500';
          if (type === 'bg') return 'bg-red-100';
          if (type === 'text') return 'text-red-800';
          return 'border-red-200';
      }
      if (s.includes('progreso') || s.includes('curso') || s.includes('ejecución')) {
          if (type === 'solid-bg') return 'bg-blue-500';
          if (type === 'bg') return 'bg-blue-100';
          if (type === 'text') return 'text-blue-800';
          return 'border-blue-200';
      }
      if (s.includes('planificación') || s.includes('diseño')) {
          if (type === 'solid-bg') return 'bg-yellow-500';
          if (type === 'bg') return 'bg-yellow-100';
          if (type === 'text') return 'text-yellow-800';
          return 'border-yellow-200';
      }
      if (s.includes('cancelado') || s.includes('detenido')) {
           if (type === 'solid-bg') return 'bg-orange-500';
           if (type === 'bg') return 'bg-orange-100';
           if (type === 'text') return 'text-orange-800';
           return 'border-orange-200';
      }
      
      if (type === 'solid-bg') return 'bg-slate-500';
      if (type === 'bg') return 'bg-slate-200';
      if (type === 'text') return 'text-slate-600';
      return 'border-slate-300';
  };

  const groupedProjects = useMemo(() => {
    if (statusFilter !== 'all') return null;
    
    const groups: Record<string, Project[]> = {};
    projectStatuses.forEach(s => groups[s] = []);
    groups['Otros'] = [];

    filteredProjects.forEach(p => {
        if (groups[p.status]) {
            groups[p.status].push(p);
        } else {
             if (!groups[p.status]) groups[p.status] = [];
             groups[p.status].push(p);
        }
    });
    return groups;
  }, [filteredProjects, projectStatuses, statusFilter]);

  const renderProjectCard = (project: Project) => (
      <div key={project.id} className="relative flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group mb-3 last:mb-0 border border-slate-100">
        <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
                <h4 className="font-bold text-slate-900">{project.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(project.status, 'bg')} ${getStatusColor(project.status, 'text')}`}>
                    {project.status}
                </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
                <span>{project.client}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span>{project.location}</span>
            </p>
            <div className="mt-3 w-full max-w-md h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${getStatusColor(project.status, 'solid-bg')}`} 
                    style={{ width: `${project.progress}%` }}
                ></div>
            </div>
            <p className="text-xs text-slate-400 mt-1">{project.progress}% Completado</p>
        </div>

        <div className="flex items-center space-x-6 pl-4">
            <div className="text-right">
                <div className="text-xs font-bold text-slate-600">Fecha Inicio</div>
                <div className="text-sm text-slate-800">{project.startDate}</div>
            </div>
            
            <div className="z-10">
                <button 
                    type="button"
                    onClick={() => setProjectToDelete(project)}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all cursor-pointer"
                    title="Eliminar Proyecto"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.client || !newProject.startDate) return;

    const projectId = `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const safeStatuses = projectStatuses as string[];
    const defaultStatus = safeStatuses.length > 0 ? safeStatuses[0] as ProjectStatus : ProjectStatus.PLANIFICACION;

    const project: Project = {
      id: projectId,
      name: newProject.name!,
      client: newProject.client!,
      location: newProject.location || 'N/A',
      budget: Number(newProject.budget) || 0,
      capacityKW: Number(newProject.capacityKW) || 0,
      startDate: newProject.startDate!,
      status: defaultStatus,
      progress: 0
    };

    let generatedTasks: Task[] = [];

    if (useTemplate) {
        generatedTasks = projectTemplate.map((item, index) => {
            const taskStartDate = new Date(newProject.startDate!);
            taskStartDate.setDate(taskStartDate.getDate() + item.offset);
            
            return {
                id: `t-${Date.now()}-${index}`,
                projectId: projectId,
                name: item.name,
                phase: item.phase,
                assignedTo: users[0]?.id || '',
                startDate: taskStartDate.toISOString().split('T')[0],
                duration: item.duration,
                progress: 0,
                status: 'Pendiente',
                dependencies: [],
                priority: item.priority as Priority,
                parentId: undefined
            };
        });
    }

    onAddProject(project, generatedTasks);
    setIsModalOpen(false);
    
    setNewProject({
        name: '',
        client: '',
        location: '',
        budget: undefined,
        capacityKW: undefined,
        startDate: new Date().toISOString().split('T')[0]
    });
    setUseTemplate(true);
  };

  const confirmDeleteProject = () => {
      if (projectToDelete && onDeleteProject) {
          onDeleteProject(projectToDelete.id);
          setProjectToDelete(null);
      }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
            <p className="text-slate-500 text-sm">Resumen general de operaciones</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors w-fit"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Proyectos Activos</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeProjects.length} / {totalProjects}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Potencia Instalada</p>
              <div className="flex items-end space-x-1 mt-1">
                <h3 className="text-2xl font-bold text-indigo-600">
                  {projects.reduce((acc, p) => acc + (p.capacityKW || 0), 0).toLocaleString()}
                </h3>
                <span className="text-sm text-slate-500 mb-0.5">kW</span>
              </div>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Presupuesto Total</p>
              <div className="flex items-end space-x-1 mt-1">
                <h3 className="text-2xl font-bold text-emerald-600">
                  ${projects.reduce((acc, p) => acc + (p.budget || 0), 0).toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Tareas en Riesgo</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">{delayedTasks}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects List & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <h2 className="text-lg font-semibold text-slate-800">Proyectos</h2>
             
             <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                     <button 
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                         Todos
                     </button>
                     {projectStatuses.map(status => (
                         <button 
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                statusFilter === status ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-200'
                            }`}
                         >
                             {status}
                         </button>
                     ))}
                 </div>
                 
                 <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                 <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        showCompleted 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                 >
                     {showCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                     <span>{showCompleted ? 'Ocultar Completados' : 'Mostrar Completados'}</span>
                 </button>
             </div>
          </div>

          <div className="p-6">
            {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                    <Filter className="w-8 h-8 mb-2 opacity-50" />
                    <p>No hay proyectos que coincidan con los filtros.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {statusFilter === 'all' && groupedProjects ? (
                        Object.entries(groupedProjects).map(([status, projs]: [string, Project[]]) => (
                            projs.length > 0 && (
                                <div key={status} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className={`px-4 py-2 border-b border-slate-200 font-bold text-sm flex justify-between items-center ${getStatusColor(status, 'bg')} ${getStatusColor(status, 'text')}`}>
                                        <span>{status}</span>
                                        <span className="bg-white/50 px-2 py-0.5 rounded text-xs">{projs.length}</span>
                                    </div>
                                    <div className="p-4 bg-white/50 space-y-3">
                                        {projs.map(renderProjectCard)}
                                    </div>
                                </div>
                            )
                        ))
                    ) : (
                        <div className="space-y-4">
                             {filteredProjects.map(renderProjectCard)}
                        </div>
                    )}
                </div>
            )}
          </div>
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Nuevo Proyecto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors flex items-start space-x-3 ${useTemplate ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                onClick={() => setUseTemplate(!useTemplate)}
              >
                  <input 
                      type="checkbox" 
                      checked={useTemplate}
                      readOnly
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                      <p className="font-bold text-slate-800">Aplicar Plantilla Estándar</p>
                      <p className="text-xs text-slate-500">Se crearán automáticamente las tareas típicas de un proyecto fotovoltaico.</p>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
                <input 
                  type="text" required
                  placeholder="Ej: Planta Solar Mariel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <input 
                    type="text" required
                    placeholder="Nombre del cliente"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newProject.client}
                    onChange={e => setNewProject({...newProject, client: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                  <input 
                    type="text"
                    placeholder="Municipio, Provincia"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newProject.location}
                    onChange={e => setNewProject({...newProject, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Presupuesto (USD)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newProject.budget ?? ''}
                    onChange={e => setNewProject({...newProject, budget: e.target.value ? Number(e.target.value) : undefined})}
                    onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capacidad (kW)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newProject.capacityKW ?? ''}
                    onChange={e => setNewProject({...newProject, capacityKW: e.target.value ? Number(e.target.value) : undefined})}
                    onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Inicio</label>
                <input 
                  type="date" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newProject.startDate}
                  onChange={e => setNewProject({...newProject, startDate: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-md transition-colors"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar Proyecto?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Se eliminarán todas las tareas asociadas a <strong>{projectToDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteProject}
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

export default Dashboard;
