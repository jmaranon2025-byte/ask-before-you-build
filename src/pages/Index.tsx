import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Login from '@/components/Login';
import Notifications from '@/components/Notifications';
import Documentation from '@/components/Documentation';
import { Project, Task, User, AutomationSettings } from '@/types';
import { shouldRunDailyReport, runDailyAutomation } from '@/services/automationService';
import { api } from '@/services/api';
import { Zap, ShieldCheck, Database, Server, Lock, UserCheck, LogOut, Activity, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';

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

// Simple Dashboard Component
const SimpleDashboard: React.FC<{ projects: Project[]; tasks: Task[] }> = ({ projects, tasks }) => {
  const activeProjects = projects.filter(p => p.status !== 'Completado' && p.status !== 'Detenido');
  const delayedTasks = tasks.filter(t => t.status === 'En Riesgo').length;
  const efficiency = activeProjects.length > 0 ? Math.round(activeProjects.reduce((acc, curr) => acc + (curr.progress || 0), 0) / activeProjects.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500 text-sm">Resumen general de operaciones</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Proyectos Activos</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeProjects.length} / {projects.length}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Activity className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Tareas en Riesgo</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">{delayedTasks}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600"><AlertTriangle className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Eficiencia Global</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{efficiency}%</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tareas</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{tasks.length}</h3>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Clock className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Proyectos</h2>
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-slate-900">{project.name}</h4>
                  <p className="text-sm text-slate-500">{project.client} • {project.location}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  project.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' :
                  project.status === 'En Progreso' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{project.status}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  project.status === 'Completado' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} style={{ width: `${project.progress}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1">{project.progress}% completado</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main App
const App: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [bootComplete, setBootComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companyLogo, setCompanyLogo] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const user = await api.auth.getSession();
      if (user) setTimeout(() => setSessionUser(user), 300);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (sessionUser && bootComplete) {
      const loadData = async () => {
        const [p, t, logo] = await Promise.all([
          api.projects.list(),
          api.tasks.list(),
          api.config.getLogo()
        ]);
        setProjects(p);
        setTasks(t);
        setCompanyLogo(logo);
      };
      loadData();
    }
  }, [sessionUser, bootComplete]);

  const handleLogout = async () => {
    await api.auth.logout();
    setSessionUser(null);
    if (bootComplete) window.location.reload();
  };

  if (!bootComplete) {
    return <SystemBoot onComplete={() => setBootComplete(true)} sessionUser={sessionUser} onLogout={handleLogout} />;
  }

  if (!sessionUser) {
    return <Login onLoginSuccess={setSessionUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <SimpleDashboard projects={projects} tasks={tasks} />;
      case 'notifications': return <Notifications projects={projects} tasks={tasks} />;
      case 'docs': return <Documentation />;
      default: return <SimpleDashboard projects={projects} tasks={tasks} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} companyLogo={companyLogo} currentUser={sessionUser} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
