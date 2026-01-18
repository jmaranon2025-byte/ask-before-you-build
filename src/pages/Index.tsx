import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import Login from '@/components/Login';
import Notifications from '@/components/Notifications';
import Documentation from '@/components/Documentation';
import Dashboard from '@/components/Dashboard';
import ProjectGantt from '@/components/ProjectGantt';
import EnterpriseManagement from '@/components/EnterpriseManagement';
import GlobalReports from '@/components/GlobalReports';
import Settings from '@/components/Settings';
import TeamManagement from '@/components/TeamManagement';
import { Project, Task, User, ProjectPhase, ProjectStatus, Department, Priority } from '@/types';
import { api } from '@/services/api';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_USERS, PROJECT_TEMPLATE } from '@/data/mockData';
import { Zap, LogOut } from 'lucide-react';

// Boot Screen Component
const SystemBoot: React.FC<{ onComplete: () => void; sessionUser: User | null; onLogout: () => void }> = ({ onComplete, sessionUser, onLogout }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Inicializando kernel del sistema...');

  useEffect(() => {
    const steps = [
      { p: 10, t: 'Cargando configuración base...' },
      { p: 30, t: 'Verificando integridad de datos locales...' },
      { p: 50, t: 'Estableciendo conexión segura TLS...' },
      { p: 70, t: 'Sincronizando módulos de gestión...' },
      { p: 90, t: 'Validando credenciales de sesión...' },
      { p: 100, t: 'Sistema RyV listo.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setTimeout(onComplete, 500);
        return;
      }
      const step = steps[currentStep];
      setProgress(step.p);
      if (currentStep >= 4 && sessionUser) {
        setStatus(`Sesión recuperada: ${sessionUser.name}`);
      } else {
        setStatus(step.t);
      }
      currentStep++;
    }, 250);

    return () => clearInterval(interval);
  }, [onComplete, sessionUser]);

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden font-mono">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.9)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md p-8">
        <div className="flex justify-center mb-8 relative">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-2xl">
            <Zap className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-1">RyV Manager <span className="text-blue-500">v2.0</span></h1>
        <p className="text-slate-500 text-center text-xs uppercase tracking-widest mb-8">Sistema de Gestión Integral</p>

        <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className={`transition-colors ${sessionUser ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>{status}</span>
          <span className="text-slate-500 font-bold">{progress}%</span>
        </div>
        
        {sessionUser && (
          <div className="mt-8 flex justify-center">
            <button onClick={onLogout} className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-red-900/30 border border-slate-700 rounded-lg text-xs text-slate-400 transition-all">
              <LogOut className="w-3 h-3" />
              <span>No soy {sessionUser.name.split(' ')[0]}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App
const App: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [bootComplete, setBootComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companyLogo, setCompanyLogo] = useState('');
  
  // Config State
  const [phases, setPhases] = useState<string[]>(Object.values(ProjectPhase));
  const [taskStatuses, setTaskStatuses] = useState<string[]>(['Pendiente', 'En Progreso', 'En Riesgo', 'Completado', 'Cancelado']);
  const [projectStatuses, setProjectStatuses] = useState<string[]>(Object.values(ProjectStatus));
  const [projectTemplate, setProjectTemplate] = useState(PROJECT_TEMPLATE);
  const [departments, setDepartments] = useState<string[]>(Object.values(Department));
  const [roles, setRoles] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [loadedProjects, loadedTasks, loadedUsers] = await Promise.all([
        api.projects.list(),
        api.tasks.list(),
        api.users.list()
      ]);
      
      setProjects(loadedProjects.length > 0 ? loadedProjects : MOCK_PROJECTS);
      setTasks(loadedTasks.length > 0 ? loadedTasks : MOCK_TASKS);
      setUsers(loadedUsers.length > 0 ? loadedUsers : MOCK_USERS);
      
      const [loadedPhases, loadedTaskStatuses, loadedProjectStatuses, loadedTemplate, loadedLogo, loadedDepts, loadedRoles] = await Promise.all([
        api.config.getPhases(),
        api.config.getTaskStatuses(),
        api.config.getProjectStatuses(),
        api.config.getTemplate(),
        api.config.getLogo(),
        api.config.getDepartments(),
        api.config.getRoles()
      ]);
      
      setPhases(loadedPhases);
      setTaskStatuses(loadedTaskStatuses);
      setProjectStatuses(loadedProjectStatuses);
      setProjectTemplate(loadedTemplate);
      setCompanyLogo(loadedLogo);
      setDepartments(loadedDepts);
      setRoles(loadedRoles);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const user = await api.auth.getSession();
      if (user) setTimeout(() => setSessionUser(user), 300);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (sessionUser && bootComplete) {
      loadData();
    }
  }, [sessionUser, bootComplete, loadData]);

  const handleLogout = async () => {
    await api.auth.logout();
    setSessionUser(null);
    if (bootComplete) window.location.reload();
  };

  // Project handlers
  const handleAddProject = async (project: Project, generatedTasks: Task[]) => {
    await api.projects.create(project);
    for (const task of generatedTasks) {
      await api.tasks.create(task);
    }
    setProjects(prev => [...prev, project]);
    setTasks(prev => [...prev, ...generatedTasks]);
    await api.audit.log('Crear', `Proyecto: ${project.name}`, 'Proyectos', sessionUser?.name || 'Sistema');
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    await api.projects.delete(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    if (project) {
      await api.audit.log('Eliminar', `Proyecto: ${project.name}`, 'Proyectos', sessionUser?.name || 'Sistema');
    }
  };

  // Task handlers
  const handleAddTask = async (task: Task) => {
    await api.tasks.create(task);
    setTasks(prev => [...prev, task]);
  };

  const handleUpdateTask = async (task: Task) => {
    await api.tasks.update(task);
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    await api.tasks.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // User handlers
  const handleAddUser = async (user: User) => {
    await api.users.create(user);
    setUsers(prev => [...prev, user]);
    await api.audit.log('Crear', `Usuario: ${user.name}`, 'Configuración', sessionUser?.name || 'Sistema');
  };

  const handleUpdateUser = async (user: User) => {
    await api.users.update(user);
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    await api.users.delete(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (user) {
      await api.audit.log('Eliminar', `Usuario: ${user.name}`, 'Configuración', sessionUser?.name || 'Sistema');
    }
  };

  // Config handlers
  const handleSaveConfig = async (config: {
    phases?: string[];
    taskStatuses?: string[];
    projectStatuses?: string[];
    template?: typeof PROJECT_TEMPLATE;
    logo?: string;
    departments?: string[];
    roles?: string[];
  }) => {
    if (config.phases) {
      await api.config.savePhases(config.phases);
      setPhases(config.phases);
    }
    if (config.taskStatuses) {
      await api.config.saveTaskStatuses(config.taskStatuses);
      setTaskStatuses(config.taskStatuses);
    }
    if (config.projectStatuses) {
      await api.config.saveProjectStatuses(config.projectStatuses);
      setProjectStatuses(config.projectStatuses);
    }
    if (config.template) {
      await api.config.saveTemplate(config.template);
      setProjectTemplate(config.template);
    }
    if (config.logo !== undefined) {
      await api.config.saveLogo(config.logo);
      setCompanyLogo(config.logo);
    }
    if (config.departments) {
      await api.config.saveDepartments(config.departments);
      setDepartments(config.departments);
    }
    if (config.roles) {
      await api.config.saveRoles(config.roles);
      setRoles(config.roles);
    }
    await api.audit.log('Actualizar', 'Configuración del sistema', 'Configuración', sessionUser?.name || 'Sistema');
  };

  const handleResetData = async () => {
    await api.projects.reset();
  };

  if (!bootComplete) {
    return <SystemBoot onComplete={() => setBootComplete(true)} sessionUser={sessionUser} onLogout={handleLogout} />;
  }

  if (!sessionUser) {
    return <Login onLoginSuccess={setSessionUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            tasks={tasks}
            users={users}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
            projectStatuses={projectStatuses}
            projectTemplate={projectTemplate}
          />
        );
      
      case 'projects':
        return (
          <ProjectGantt
            projects={projects}
            tasks={tasks}
            users={users}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            phases={phases}
            taskStatuses={taskStatuses}
          />
        );
      
      case 'enterprise':
        return (
          <EnterpriseManagement
            tasks={tasks}
            users={users}
            departments={departments}
            taskStatuses={taskStatuses}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      
      case 'reports':
        return (
          <GlobalReports
            projects={projects}
            tasks={tasks}
            users={users}
          />
        );
      
      case 'team':
        return (
          <TeamManagement
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onResetData={handleResetData}
            departments={departments}
            roles={roles}
          />
        );
      
      case 'docs':
        return <Documentation />;
      
      case 'notifications':
        return (
          <Notifications
            projects={projects}
            tasks={tasks}
          />
        );
      
      case 'settings':
        return (
          <Settings
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onResetData={handleResetData}
            phases={phases}
            setPhases={(p) => handleSaveConfig({ phases: p })}
            taskStatuses={taskStatuses}
            setTaskStatuses={(s) => handleSaveConfig({ taskStatuses: s })}
            projectStatuses={projectStatuses}
            setProjectStatuses={(s) => handleSaveConfig({ projectStatuses: s })}
            projectTemplate={projectTemplate}
            setProjectTemplate={(t) => handleSaveConfig({ template: t })}
            companyLogo={companyLogo}
            setCompanyLogo={(l) => handleSaveConfig({ logo: l })}
            departments={departments}
            setDepartments={(d) => handleSaveConfig({ departments: d })}
            roles={roles}
            setRoles={(r) => handleSaveConfig({ roles: r })}
            projects={projects}
            tasks={tasks}
            setProjects={setProjects}
            setTasks={setTasks}
          />
        );
      
      default:
        return (
          <Dashboard
            projects={projects}
            tasks={tasks}
            users={users}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
            projectStatuses={projectStatuses}
            projectTemplate={projectTemplate}
          />
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} companyLogo={companyLogo} currentUser={sessionUser} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
