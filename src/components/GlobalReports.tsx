import React, { useState, useEffect } from 'react';
import { Project, Task, User, AutomationSettings, EmailLogEntry } from '@/types';
import { Printer, Filter, Calendar, User as UserIcon, Briefcase, Mail, CheckSquare, Square, X, Clock, FileDown, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { logEmailEvent } from '@/services/automationService';
import { logSystemAction } from '@/services/auditService';

interface GlobalReportsProps {
  projects: Project[];
  tasks: Task[];
  users: User[];
}

const GlobalReports: React.FC<GlobalReportsProps> = ({ projects, tasks, users }) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [taskSource, setTaskSource] = useState<'all' | 'project' | 'enterprise'>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [hideCompleted, setHideCompleted] = useState<boolean>(true); 

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);

  const loadLogs = () => {
      try {
          const savedLogs = localStorage.getItem('helios_email_logs');
          if (savedLogs) {
              setEmailLogs(JSON.parse(savedLogs));
          } else {
              setEmailLogs([]);
          }
      } catch (e) {
          console.error("Error loading logs", e);
      }
  };

  useEffect(() => {
      if (isHistoryOpen) {
          loadLogs();
      }
  }, [isHistoryOpen]);

  const filteredTasks = tasks.filter(task => {
    const matchesUser = selectedUser === 'all' || task.assignedTo === selectedUser;
    
    let matchesDate = true;
    if (dateStart && dateEnd) {
        matchesDate = task.startDate >= dateStart && task.startDate <= dateEnd;
    } else if (dateStart) {
        matchesDate = task.startDate >= dateStart;
    }

    let matchesSource = true;
    if (taskSource === 'project') {
        matchesSource = !task.isEnterprise;
    } else if (taskSource === 'enterprise') {
        matchesSource = !!task.isEnterprise;
    }

    let matchesStatus = true;
    if (hideCompleted) {
        matchesStatus = task.status !== 'Completado' && task.status !== 'Cancelado';
    }

    return matchesUser && matchesDate && matchesSource && matchesStatus;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      if (a.id === b.parentId) return -1;
      if (b.id === a.parentId) return 1;
      return 0; 
  });

  const getContextName = (task: Task) => {
      if (task.isEnterprise) return task.department || 'Gestión Empresarial';
      return projects.find(p => p.id === task.projectId)?.name || 'Proyecto Desconocido';
  };
  
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Sin Asignar';

  const handlePrint = () => {
    logSystemAction('Imprimir Reporte', `Reporte filtrado (${sortedTasks.length} tareas)`, 'Reportes');
    setTimeout(() => window.print(), 100);
  };

  const handleSavePDF = () => {
    logSystemAction('Guardar PDF', `Solicitud de PDF (${sortedTasks.length} tareas)`, 'Reportes');
    setTimeout(() => window.print(), 100);
  };

  const handleOpenEmailModal = () => {
      let initialSelection: string[] = [];

      if (selectedUser !== 'all') {
          initialSelection = [selectedUser];
      } else {
          try {
              const savedDefaultsStr = localStorage.getItem('helios_report_defaults');
              if (savedDefaultsStr) {
                  const parsed = JSON.parse(savedDefaultsStr);
                  if (Array.isArray(parsed)) {
                      initialSelection = parsed.filter(id => users.some(u => u.id === id));
                  }
              }
          } catch (e) {
              console.error("Error reading default recipients", e);
              initialSelection = [];
          }
      }
      setSelectedRecipients(initialSelection);
      setIsEmailModalOpen(true);
  };

  const toggleRecipient = (userId: string) => {
      setSelectedRecipients(prev => 
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  const saveAsDefault = () => {
      localStorage.setItem('helios_report_defaults', JSON.stringify(selectedRecipients));
      alert(`Grupo de ${selectedRecipients.length} personas guardado como predeterminado.`);
  };

  const handleSendReport = async () => {
      if (selectedRecipients.length === 0) {
          alert("Selecciona al menos un destinatario.");
          return;
      }

      setSendingStatus('sending');

      const recipients = users.filter(u => selectedRecipients.includes(u.id));
      const reportTitle = `Reporte de Estado RyV - ${new Date().toLocaleDateString()}`;
      
      let bodyText = `REPORTE DE ACTIVIDADES\nFecha: ${new Date().toLocaleDateString()}\n`;
      bodyText += `Tareas Listadas: ${sortedTasks.length}\n`;
      bodyText += `Filtro: ${hideCompleted ? 'Solo Pendientes' : 'Todas'}\n\n`;
      
      const maxTasks = 40;
      const tasksToShow = sortedTasks.slice(0, maxTasks);
      
      bodyText += tasksToShow.map(t => {
          const context = t.isEnterprise ? (t.department || 'Dpto') : 'Proy';
          return `- [${t.startDate}] [${t.status}] ${t.name} (${context} - ${getUserName(t.assignedTo)})`;
      }).join('\n');

      if (sortedTasks.length > maxTasks) bodyText += `\n... y ${sortedTasks.length - maxTasks} más.`;

      const automationSettingsStr = localStorage.getItem('helios_automation');
      let usedEmailJS = false;

      if (automationSettingsStr) {
          const settings: AutomationSettings = JSON.parse(automationSettingsStr);
          if (settings.emailJsPublicKey && settings.emailJsServiceId && settings.emailJsTemplateId && (window as any).emailjs) {
              try {
                  (window as any).emailjs.init(settings.emailJsPublicKey);
                  
                  for (const user of recipients) {
                      if (user.email.includes('@helioscuba.cu')) continue;

                      try {
                        await (window as any).emailjs.send(
                            settings.emailJsServiceId!,
                            settings.emailJsTemplateId!,
                            {
                                to_email: user.email,
                                to_name: user.name,
                                subject: reportTitle,
                                message: bodyText,
                                task_count: sortedTasks.length
                            }
                        );
                        logEmailEvent(user.name, user.email, reportTitle, 'Enviado', 'Manual');
                        await new Promise(resolve => setTimeout(resolve, 100)); 

                      } catch(e) {
                          logEmailEvent(user.name, user.email, reportTitle, 'Error', 'Manual');
                          console.error("EmailJS Error", e);
                      }
                  }

                  usedEmailJS = true;
                  setSendingStatus('success');
                  logSystemAction('Enviar Reporte', `Reporte enviado a ${recipients.length} destinatarios`, 'Reportes');
                  setTimeout(() => {
                      setIsEmailModalOpen(false);
                      setSendingStatus('idle');
                  }, 2000);
                  return; 

              } catch (error) {
                  console.error("EmailJS Failed, falling back to mailto", error);
              }
          }
      }

      if (!usedEmailJS) {
          const recipientEmails = recipients.map(u => u.email).filter(e => e && !e.includes('helioscuba.cu'));
          const mailtoLink = `mailto:?bcc=${recipientEmails.join(',')}&subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent(bodyText)}`;
          
          recipients.forEach(u => logEmailEvent(u.name, u.email, reportTitle, 'Enviado', 'Manual'));
          logSystemAction('Enviar Reporte (Mailto)', `Reporte abierto en cliente de correo`, 'Reportes');
          
          loadLogs();

          setTimeout(() => {
              window.location.href = mailtoLink;
              setSendingStatus('idle');
              setIsEmailModalOpen(false);
          }, 300);
      }
  };

  const getStatusBadgeClass = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('completado')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      if (s.includes('riesgo')) return 'bg-red-100 text-red-700 border-red-200';
      if (s.includes('progreso')) return 'bg-blue-100 text-blue-700 border-blue-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center no-print gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes Globales</h1>
          <p className="text-slate-500 text-sm">Generación de listados para seguimiento y control</p>
        </div>
        <div className="flex flex-wrap space-x-3 gap-y-2">
            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center space-x-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Clock className="w-4 h-4" />
                <span>Historial</span>
            </button>
            <button 
                onClick={handleOpenEmailModal}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
                <Mail className="w-4 h-4" />
                <span>Enviar Email</span>
            </button>
            
            <button 
                onClick={handleSavePDF}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
                <FileDown className="w-4 h-4" />
                <span>Guardar PDF</span>
            </button>

            <button 
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                title="Imprimir"
            >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtros de Búsqueda
            </h3>
            
            <label className="flex items-center cursor-pointer space-x-2">
                <div className="relative">
                    <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={hideCompleted} 
                        onChange={() => setHideCompleted(!hideCompleted)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${hideCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideCompleted ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-medium text-slate-600">Ocultar Tareas Terminadas</span>
            </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Responsable</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <select 
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                    >
                        <option value="all">Todos los empleados</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Origen</label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <select 
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={taskSource}
                        onChange={(e) => setTaskSource(e.target.value as any)}
                    >
                        <option value="all">Todo (Proyectos + Empresa)</option>
                        <option value="project">Solo Proyectos</option>
                        <option value="enterprise">Solo Gestión Empresarial</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Inicio (Desde)</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input 
                        type="date" 
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Fin (Hasta)</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input 
                        type="date" 
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Report Content */}
      <div id="printable-area" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print-full-width">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Listado de Actividades</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {hideCompleted ? 'Solo tareas pendientes o en curso.' : 'Todas las tareas (incluye completadas).'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">Fecha de Corte: {new Date().toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">Total: {sortedTasks.length} registros</p>
                </div>
              </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="p-4 w-1/4">Origen</th>
                        <th className="p-4 w-1/3">Tarea y Jerarquía</th>
                        <th className="p-4">Responsable</th>
                        <th className="p-4">Fecha Inicio</th>
                        <th className="p-4 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedTasks.length > 0 ? sortedTasks.map(task => (
                        <tr key={task.id} className="break-inside-avoid">
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${task.isEnterprise ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {task.isEnterprise ? 'Empresa' : 'Proyecto'}
                                </span>
                                <p className="text-slate-700 mt-1 font-medium truncate max-w-[200px]">{getContextName(task)}</p>
                            </td>
                            <td className="p-4">
                                <p className="font-medium text-slate-800">{task.name}</p>
                                {task.parentId && (
                                    <p className="text-xs text-slate-400 mt-0.5">↳ Subtarea</p>
                                )}
                            </td>
                            <td className="p-4 text-slate-600">{getUserName(task.assignedTo)}</td>
                            <td className="p-4 text-slate-600">{task.startDate}</td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusBadgeClass(task.status)}`}>
                                    {task.status}
                                </span>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                No hay tareas que coincidan con los filtros aplicados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Enviar Reporte por Email</h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">Selecciona los destinatarios del reporte:</p>
                
                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
                    {users.map(user => (
                        <div 
                            key={user.id}
                            onClick={() => toggleRecipient(user.id)}
                            className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedRecipients.includes(user.id) 
                                ? 'bg-indigo-50 border border-indigo-200' 
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                        >
                            {selectedRecipients.includes(user.id) ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 mr-3" />
                            ) : (
                                <Square className="w-4 h-4 text-slate-300 mr-3" />
                            )}
                            <div>
                                <p className="font-medium text-sm text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex justify-between items-center">
                    <button 
                        onClick={saveAsDefault}
                        className="text-sm text-indigo-600 hover:underline"
                    >
                        Guardar como predeterminado
                    </button>
                    <span className="text-xs text-slate-400">{selectedRecipients.length} seleccionados</span>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        onClick={() => setIsEmailModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSendReport}
                        disabled={sendingStatus === 'sending'}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-colors flex items-center disabled:opacity-50"
                    >
                        {sendingStatus === 'sending' ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : sendingStatus === 'success' ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                ¡Enviado!
                            </>
                        ) : (
                            <>
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Reporte
                            </>
                        )}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Historial de Envíos</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
                {emailLogs.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                        <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No hay registros de envíos.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {emailLogs.slice().reverse().map((log, idx) => (
                            <div key={idx} className="flex items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                                {log.status === 'Enviado' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className="font-medium text-sm text-slate-800">{log.recipientName}</p>
                                    <p className="text-xs text-slate-500">{log.recipientEmail}</p>
                                    <p className="text-xs text-slate-400 mt-1">{log.subject}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-0.5 rounded ${log.status === 'Enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {log.status}
                                    </span>
                                    <p className="text-xs text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalReports;
