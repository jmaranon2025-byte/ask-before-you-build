import { Task, Project } from '@/types';

export const generateDailyReport = async (tasks: Task[], projects: Project[]) => {
  // En modo demo, retornamos un reporte simulado
  console.warn("Gemini API: Modo demo activo. Retornando respuesta simulada.");
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const criticalTasks = tasks.filter(t => t.status === 'En Riesgo' || t.priority === 'Crítica');
  const activeProjects = projects.filter(p => p.status !== 'Completado');
  
  return {
    subject: `Resumen Diario de Actividades - RyV Instalaciones Eléctricas (${new Date().toLocaleDateString()})`,
    body: `📊 *Resumen Ejecutivo Diario*

🔴 **Alertas Críticas:**
${criticalTasks.length > 0 
  ? criticalTasks.slice(0, 5).map(t => `• ${t.name} - Estado: ${t.status}`).join('\n')
  : '• Sin alertas críticas en este momento'}

📈 **Proyectos Activos:** ${activeProjects.length}
${activeProjects.slice(0, 3).map(p => `• ${p.name}: ${p.progress}% completado`).join('\n')}

✅ **Recomendaciones:**
1. Priorizar las tareas marcadas como "En Riesgo"
2. Revisar dependencias de tareas críticas
3. Actualizar el progreso de tareas en ejecución

*Reporte generado automáticamente por el sistema de gestión RyV.*
*Para activar reportes con IA real, configure las credenciales de Lovable AI.*`
  };
};

export const suggestMitigation = async (blockedTask: Task) => {
  return `Sugerencia: Para desbloquear "${blockedTask.name}", contactar al proveedor o responsable inmediatamente. Considerar alternativas de suministro local.`;
};
