import React, { useState, useEffect } from 'react';
import TeamManagement from './TeamManagement';
import { User, Project, Task, AutomationSettings } from '@/types';
import { 
  Layers, ListChecks, Users as UsersIcon, Settings as SettingsIcon, 
  Plus, Trash2, Image as ImageIcon, Upload, Database, Download, 
  FileText, Shield, Building2, Briefcase, UserCog, ClipboardList, 
  Workflow, Clock, Mail, Send, ChevronRight
} from 'lucide-react';
import { getAuditLogs, clearAuditLogs, logSystemAction } from '@/services/auditService';

interface SettingsProps {
    users: User[];
    onAddUser: (user: User) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
    onResetData: () => void;
    
    phases: string[];
    setPhases: (phases: string[]) => void;
    
    taskStatuses: string[];
    setTaskStatuses: (statuses: string[]) => void;
    
    projectStatuses: string[];
    setProjectStatuses: (statuses: string[]) => void;
    
    projectTemplate: any[];
    setProjectTemplate: (template: any[]) => void;

    companyLogo: string;
    setCompanyLogo: (logo: string) => void;

    departments: string[];
    setDepartments: (depts: string[]) => void;

    roles: string[];
    setRoles: (roles: string[]) => void;

    projects: Project[];
    tasks: Task[];
    setProjects: (p: Project[]) => void;
    setTasks: (t: Task[]) => void;
}

type SettingsTab = 'empresa' | 'areas' | 'roles' | 'equipo' | 'reportes' | 'fases' | 'estados' | 'plantilla' | 'automatizacion' | 'auditoria' | 'database';

const Settings: React.FC<SettingsProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');
    const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
        enabled: false,
        dailyReportTime: '07:00',
        emailJsServiceId: '',
        emailJsTemplateId: '',
        emailJsPublicKey: '',
        adminEmail: ''
    });

    useEffect(() => {
        const saved = localStorage.getItem('helios_automation');
        if (saved) {
            setAutomationSettings(JSON.parse(saved));
        }
    }, []);

    const saveAutomationSettings = (newSettings: AutomationSettings) => {
        setAutomationSettings(newSettings);
        localStorage.setItem('helios_automation', JSON.stringify(newSettings));
        logSystemAction('Configurar Automatización', 'Ajustes guardados', 'Configuración');
    };

    const sendTestEmail = async () => {
        if (!automationSettings.emailJsPublicKey || !automationSettings.emailJsServiceId || !automationSettings.emailJsTemplateId) {
            alert('Configura todos los campos de EmailJS primero.');
            return;
        }

        try {
            if ((window as any).emailjs) {
                (window as any).emailjs.init(automationSettings.emailJsPublicKey);
                await (window as any).emailjs.send(
                    automationSettings.emailJsServiceId,
                    automationSettings.emailJsTemplateId,
                    {
                        to_email: automationSettings.adminEmail || 'test@example.com',
                        to_name: 'Administrador',
                        subject: 'Email de Prueba - RyV',
                        message: 'Este es un email de prueba del sistema RyV Instalaciones Eléctricas.',
                        task_count: 0
                    }
                );
                alert('Email de prueba enviado correctamente.');
                logSystemAction('Email de Prueba', 'Enviado correctamente', 'Automatización');
            } else {
                alert('EmailJS no está cargado. Agrega el script de EmailJS en tu HTML.');
            }
        } catch (error) {
            console.error('Error enviando email:', error);
            alert('Error al enviar email de prueba.');
        }
    };

    const menuItems = [
        { id: 'empresa', label: 'Empresa', sublabel: 'Identidad Corporativa', icon: Building2 },
        { id: 'areas', label: 'Áreas/Dptos', sublabel: 'Estructura organizativa', icon: Briefcase },
        { id: 'roles', label: 'Roles', sublabel: 'Perfiles de usuario', icon: UserCog },
        { id: 'equipo', label: 'Equipo', sublabel: 'Usuarios y códigos', icon: UsersIcon },
        { id: 'reportes', label: 'Reportes', sublabel: 'Destinatarios predeterminados', icon: ClipboardList },
        { id: 'fases', label: 'Fases', sublabel: 'Etapas de proyecto', icon: Layers },
        { id: 'estados', label: 'Estados', sublabel: 'Flujos de trabajo', icon: Workflow },
        { id: 'plantilla', label: 'Plantilla', sublabel: 'Tareas por defecto', icon: FileText },
        { id: 'automatizacion', label: 'Automatización', sublabel: 'Correos y alertas', icon: Mail },
        { id: 'auditoria', label: 'Auditoría', sublabel: 'Registro de operaciones', icon: Shield },
        { id: 'database', label: 'Base de Datos', sublabel: 'Importar/Exportar', icon: Database },
    ];

    const ListEditor = ({ title, items, onSave }: { title: string; items: string[]; onSave: (items: string[]) => void }) => {
        const [localItems, setLocalItems] = useState<string[]>(items);
        const [newItem, setNewItem] = useState('');

        const handleAddItem = () => {
            if (newItem.trim()) {
                const updated = [...localItems, newItem.trim()];
                setLocalItems(updated);
                onSave(updated);
                setNewItem('');
            }
        };

        const handleDeleteItem = (index: number) => {
            const updated = localItems.filter((_, i) => i !== index);
            setLocalItems(updated);
            onSave(updated);
        };

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
                <div className="space-y-3">
                    {localItems.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <input 
                                type="text" 
                                value={item}
                                onChange={(e) => {
                                    const updated = [...localItems];
                                    updated[idx] = e.target.value;
                                    setLocalItems(updated);
                                }}
                                onBlur={() => onSave(localItems)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                            <button onClick={() => handleDeleteItem(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 mt-4">
                        <input 
                            type="text" 
                            placeholder="Añadir nuevo..."
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                        />
                        <button onClick={handleAddItem} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const AuditLogViewer = () => {
        const logs = getAuditLogs();
        
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full max-h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-indigo-600" />
                        Auditoría del Sistema
                    </h3>
                    <button onClick={() => { if(confirm("¿Borrar historial?")) clearAuditLogs(); }} className="text-xs text-red-600 hover:underline">Limpiar</button>
                </div>

                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                            <tr>
                                <th className="p-3 border-b">Fecha/Hora</th>
                                <th className="p-3 border-b">Módulo</th>
                                <th className="p-3 border-b">Acción</th>
                                <th className="p-3 border-b">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Sin registros.</td></tr>
                            )}
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-slate-500 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">{log.module}</span></td>
                                    <td className="p-3 font-medium text-slate-800">{log.action}</td>
                                    <td className="p-3 text-slate-500 text-xs truncate max-w-xs">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const BrandingEditor = () => {
        const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    props.setCompanyLogo(reader.result as string);
                    logSystemAction('Cambio Logo', 'Se actualizó el logo', 'Configuración');
                };
                reader.readAsDataURL(file);
            }
        };

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Identidad Corporativa</h3>
                <div className="flex items-start space-x-6">
                    <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                        {props.companyLogo ? (
                            <img src={props.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                        )}
                    </div>
                    
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Logo de la Empresa</label>
                        <p className="text-xs text-slate-500 mb-4">Sube tu logo (PNG o JPG).</p>
                        
                        <div className="flex items-center space-x-3">
                            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center">
                                <Upload className="w-4 h-4 mr-2" />
                                <span>Subir</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                            {props.companyLogo && (
                                <button onClick={() => props.setCompanyLogo('')} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium">
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const AutomationEditor = () => {
        return (
            <div className="space-y-6">
                {/* Rutina Matutina */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">Rutina Matutina Automática (7:00 AM)</h4>
                            <p className="text-sm text-slate-600 mt-1">
                                El sistema revisará automáticamente todas las tareas pendientes cada mañana.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Configuración de Envío */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold text-slate-800">Configuración de Envío</h4>
                        <label className="flex items-center cursor-pointer space-x-2">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={automationSettings.enabled} 
                                    onChange={() => saveAutomationSettings({...automationSettings, enabled: !automationSettings.enabled})}
                                />
                                <div className={`block w-12 h-7 rounded-full transition-colors ${automationSettings.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${automationSettings.enabled ? 'transform translate-x-5' : ''}`}></div>
                            </div>
                            <span className="text-sm font-medium text-slate-700">Activado</span>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Correo del Administrador</label>
                            <input 
                                type="email"
                                value={automationSettings.adminEmail}
                                onChange={(e) => saveAutomationSettings({...automationSettings, adminEmail: e.target.value})}
                                placeholder="admin@empresa.com"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Service ID</label>
                                <input 
                                    type="text"
                                    value={automationSettings.emailJsServiceId}
                                    onChange={(e) => saveAutomationSettings({...automationSettings, emailJsServiceId: e.target.value})}
                                    placeholder="service_xxxxxx"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Template ID</label>
                                <input 
                                    type="text"
                                    value={automationSettings.emailJsTemplateId}
                                    onChange={(e) => saveAutomationSettings({...automationSettings, emailJsTemplateId: e.target.value})}
                                    placeholder="template_xxxxxx"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Public Key (API Key)</label>
                            <input 
                                type="text"
                                value={automationSettings.emailJsPublicKey}
                                onChange={(e) => saveAutomationSettings({...automationSettings, emailJsPublicKey: e.target.value})}
                                placeholder="zT-xxxxxxxxxx"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <button 
                            onClick={sendTestEmail}
                            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>Enviar Email de Prueba Ahora</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const DataManagement = () => {
        const handleExport = () => {
            const dataStr = JSON.stringify({ projects: props.projects, tasks: props.tasks, users: props.users }, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `helios_backup_${new Date().toISOString().slice(0,10)}.json`;
            link.click();
            logSystemAction('Backup', 'Exportación de datos', 'Sistema');
        };
        
        const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const json = JSON.parse(evt.target?.result as string);
                    if(json.projects) props.setProjects(json.projects);
                    if(json.tasks) props.setTasks(json.tasks);
                    alert("Importado correctamente");
                    logSystemAction('Restauración', 'Importación de Backup', 'Sistema');
                } catch {
                    alert("Error al importar");
                }
            };
            reader.readAsText(file);
        };

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Gestión de Datos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleExport} className="flex items-center justify-center space-x-2 p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100">
                        <Download className="w-5 h-5" />
                        <span>Exportar Backup</span>
                    </button>
                    <label className="flex items-center justify-center space-x-2 p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 cursor-pointer">
                        <FileText className="w-5 h-5" />
                        <span>Importar Backup</span>
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'empresa':
                return <BrandingEditor />;
            case 'areas':
                return <ListEditor title="Departamentos / Áreas" items={props.departments} onSave={props.setDepartments} />;
            case 'roles':
                return <ListEditor title="Roles de Usuario" items={props.roles} onSave={props.setRoles} />;
            case 'equipo':
                return (
                    <TeamManagement 
                        users={props.users}
                        onAddUser={props.onAddUser}
                        onUpdateUser={props.onUpdateUser}
                        onDeleteUser={props.onDeleteUser}
                        onResetData={props.onResetData}
                        departments={props.departments}
                        roles={props.roles}
                    />
                );
            case 'reportes':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Destinatarios Predeterminados</h3>
                        <p className="text-slate-500 text-sm">Configura los destinatarios predeterminados para reportes automáticos.</p>
                    </div>
                );
            case 'fases':
                return <ListEditor title="Fases de Proyecto" items={props.phases} onSave={props.setPhases} />;
            case 'estados':
                return (
                    <div className="space-y-6">
                        <ListEditor title="Estados de Tarea" items={props.taskStatuses} onSave={props.setTaskStatuses} />
                        <ListEditor title="Estados de Proyecto" items={props.projectStatuses} onSave={props.setProjectStatuses} />
                    </div>
                );
            case 'plantilla':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Plantilla de Tareas</h3>
                        <p className="text-slate-500 text-sm">Define tareas predeterminadas para nuevos proyectos.</p>
                    </div>
                );
            case 'automatizacion':
                return <AutomationEditor />;
            case 'auditoria':
                return <AuditLogViewer />;
            case 'database':
                return <DataManagement />;
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            {/* Sidebar Menu */}
            <div className="w-full md:w-72 flex-shrink-0">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Configuración General</h1>
                </div>
                
                <nav className="space-y-1">
                    {menuItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id as SettingsTab)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                                activeTab === item.id 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === item.id ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-sm">{item.label}</div>
                                <div className="text-xs text-slate-400">{item.sublabel}</div>
                            </div>
                            {activeTab === item.id && <ChevronRight className="w-4 h-4 text-blue-500" />}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default Settings;