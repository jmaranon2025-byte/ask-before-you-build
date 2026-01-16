import { Task, User, AutomationSettings, EmailLogEntry } from '@/types';

declare global {
  interface Window {
    emailjs: any;
  }
}

export const logEmailEvent = (
  recipientName: string, 
  recipientEmail: string, 
  subject: string, 
  status: 'Enviado' | 'Error',
  type: 'Automático' | 'Manual'
) => {
  try {
    const currentLogsStr = localStorage.getItem('helios_email_logs');
    const logs: EmailLogEntry[] = currentLogsStr ? JSON.parse(currentLogsStr) : [];
    
    const newEntry: EmailLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      recipientName,
      recipientEmail,
      subject,
      status,
      type
    };

    logs.unshift(newEntry);
    if (logs.length > 500) logs.pop();
    
    localStorage.setItem('helios_email_logs', JSON.stringify(logs));
  } catch (e) {
    console.error("Error saving email log", e);
  }
};

export const shouldRunDailyReport = (settings: AutomationSettings): boolean => {
  if (!settings.enabled) return false;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  if (settings.lastRunDate === todayStr) return false;
  if (now.getHours() >= 7) return true;

  return false;
};

const generateEmailContent = (user: User, tasks: Task[], isForAdmin: boolean = false) => {
  const pendingTasks = tasks.filter(t => t.status !== 'Completado' && t.status !== 'Cancelado');
  
  const greeting = `Hola ${user.name},`;
  const intro = isForAdmin 
    ? `Resumen diario AUTOMÁTICO de tus tareas administrativas y supervisión (7:00 AM).`
    : `Este es un recordatorio automático de tus tareas pendientes en el sistema RyV.`;

  const taskList = pendingTasks.length > 0 
    ? pendingTasks.map(t => `- [${t.status.toUpperCase()}] ${t.name} (Vence: ${t.startDate})`).join('\n')
    : "¡Excelente! No tienes tareas pendientes.";

  const footer = `\nPor favor, actualiza el estado en la aplicación hoy.\n\nAtentamente,\nBot de Gestión RyV`;
  const warning = `\n\n--------------------------------\n[AVISO SISTEMA]: Si lees esto y no eres ${user.name}, es porque estás usando el Plan Gratuito de EmailJS.`;

  return {
    subject: `[RyV] ${isForAdmin ? 'Reporte Admin' : 'Recordatorio Tareas'}: ${pendingTasks.length} pendientes`,
    body: `${greeting}\n\n${intro}\n\nResumen:\n${taskList}\n${footer}${warning}`,
    to_name: user.name,
    to_email: user.email,
    message: taskList,
    task_count: pendingTasks.length
  };
};

export const runDailyAutomation = async (
  tasks: Task[], 
  users: User[], 
  settings: AutomationSettings
): Promise<{ success: boolean, count: number, adminNotified: boolean }> => {
  
  console.log("🚀 Iniciando automatización de las 7:00 AM...");
  
  const useRealEmail = settings.emailJsServiceId && settings.emailJsTemplateId && settings.emailJsPublicKey && window.emailjs;
  
  if (useRealEmail) {
    try {
      window.emailjs.init(settings.emailJsPublicKey!);
    } catch (e) {
      console.error("Error initializing EmailJS:", e);
    }
  }
  
  let emailsSent = 0;
  let adminNotified = false;

  const tasksByUser: Record<string, Task[]> = {};
  users.forEach(u => tasksByUser[u.id] = []);
  tasks.forEach(t => {
    if (t.assignedTo && tasksByUser[t.assignedTo]) {
      tasksByUser[t.assignedTo].push(t);
    }
  });

  for (const user of users) {
    const userTasks = tasksByUser[user.id] || [];
    const pending = userTasks.filter(t => t.status !== 'Completado' && t.status !== 'Cancelado');
    
    const isAdmin = user.email === settings.adminEmail || user.role === 'Administrador' || user.id === 'u1'; 
    
    if (pending.length > 0 || isAdmin) {
      const content = generateEmailContent(user, pending, isAdmin);
      
      if (useRealEmail) {
        if (user.email.includes('@helioscuba.cu')) {
          console.warn(`⚠️ OMITIDO: ${user.email} (Dominio de prueba)`);
          continue; 
        }

        try {
          console.log(`📨 Enviando correo real a ${user.email}...`);
          await window.emailjs.send(
            settings.emailJsServiceId!,
            settings.emailJsTemplateId!,
            {
              to_name: content.to_name,
              to_email: content.to_email,
              message: content.body,
              subject: content.subject
            }
          );
          emailsSent++;
          if (isAdmin) adminNotified = true;
          
          logEmailEvent(user.name, user.email, content.subject, 'Enviado', 'Automático');
          await new Promise(r => setTimeout(r, 500)); 
        } catch (error) {
          console.error(`❌ Error enviando a ${user.email}:`, error);
          logEmailEvent(user.name, user.email, content.subject, 'Error', 'Automático');
        }
      } else {
        console.log(`[SIMULACIÓN] 📨 Enviando a ${user.email}`);
        emailsSent++;
        if (isAdmin) adminNotified = true;
      }
    }
  }

  return { success: true, count: emailsSent, adminNotified };
};

export const constructMailtoLink = (email: string, subject: string, body: string) => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
