import { supabase } from '@/integrations/supabase/client';
import { Project, Task, User, Priority, ProjectStatus, Department } from '@/types';
import { Database } from '@/integrations/supabase/types';

type DbProject = Database['public']['Tables']['projects']['Row'];
type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbProfile = Database['public']['Tables']['profiles']['Row'];

// Map DB project_status to app ProjectStatus
const mapDbStatus = (dbStatus: string | null): ProjectStatus => {
  const statusMap: Record<string, ProjectStatus> = {
    'Planificación': ProjectStatus.PLANIFICACION,
    'En Progreso': ProjectStatus.EN_PROGRESO,
    'Completado': ProjectStatus.COMPLETADO,
    'Detenido': ProjectStatus.DETENIDO,
    'Cancelado': ProjectStatus.CANCELADO,
  };
  return statusMap[dbStatus || ''] || ProjectStatus.PLANIFICACION;
};

// Map app ProjectStatus to DB status
const mapAppStatus = (appStatus: ProjectStatus): string => {
  const statusMap: Record<ProjectStatus, string> = {
    [ProjectStatus.PLANIFICACION]: 'Planificación',
    [ProjectStatus.EN_PROGRESO]: 'En Progreso',
    [ProjectStatus.COMPLETADO]: 'Completado',
    [ProjectStatus.DETENIDO]: 'Detenido',
    [ProjectStatus.CANCELADO]: 'Cancelado',
  };
  return statusMap[appStatus] || 'Planificación';
};

// Map DB priority to app Priority
const mapDbPriority = (dbPriority: string | null): Priority => {
  const priorityMap: Record<string, Priority> = {
    'Crítica': Priority.CRITICA,
    'Alta': Priority.ALTA,
    'Media': Priority.MEDIA,
    'Baja': Priority.BAJA,
  };
  return priorityMap[dbPriority || ''] || Priority.MEDIA;
};

// Map app Priority to DB priority
const mapAppPriority = (appPriority: Priority): string => {
  const priorityMap: Record<Priority, string> = {
    [Priority.CRITICA]: 'Crítica',
    [Priority.ALTA]: 'Alta',
    [Priority.MEDIA]: 'Media',
    [Priority.BAJA]: 'Baja',
  };
  return priorityMap[appPriority] || 'Media';
};

// Helper to map database project to app Project
const mapDbProject = (dbProject: any): Project => ({
  id: dbProject.id,
  name: dbProject.name,
  client: dbProject.client,
  location: dbProject.location || '',
  budget: Number(dbProject.budget) || 0,
  capacityKW: Number(dbProject.capacity_kw) || 0,
  startDate: dbProject.start_date,
  status: mapDbStatus(dbProject.status),
  progress: dbProject.progress || 0,
});

// Helper to map database task to app Task
const mapDbTask = (dbTask: any): Task => ({
  id: dbTask.id,
  projectId: dbTask.project_id || '',
  name: dbTask.name,
  phase: dbTask.phase || '',
  assignedTo: dbTask.assigned_to || '',
  startDate: dbTask.start_date,
  duration: dbTask.duration || 1,
  progress: dbTask.progress || 0,
  status: dbTask.status || 'Pendiente',
  priority: mapDbPriority(dbTask.priority),
  dependencies: [],
  parentId: dbTask.parent_id,
  isEnterprise: dbTask.is_enterprise || false,
  department: dbTask.department,
});

// Helper to map database profile to app User
const mapDbUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email || '',
  role: dbUser.role || 'Viewer',
  department: dbUser.department_id as Department,
  avatar: dbUser.avatar,
  accessCode: dbUser.access_code,
  isActive: dbUser.is_active ?? true,
});

// Projects
export const fetchProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
  
  return (data || []).map(mapDbProject);
};

export const createProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: project.name,
      client: project.client,
      location: project.location,
      budget: project.budget,
      capacity_kw: project.capacityKW,
      start_date: project.startDate,
      status: project.status,
      progress: project.progress,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }
  
  return mapDbProject(data);
};

export const updateProject = async (project: Project): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: project.name,
      client: project.client,
      location: project.location,
      budget: project.budget,
      capacity_kw: project.capacityKW,
      start_date: project.startDate,
      status: project.status,
      progress: project.progress,
    })
    .eq('id', project.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }
  
  return mapDbProject(data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  
  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Tasks
export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  
  // Fetch dependencies for each task
  const tasks = (data || []).map(mapDbTask);
  
  // Fetch all dependencies
  const { data: depsData } = await supabase
    .from('task_dependencies')
    .select('task_id, depends_on_id');
  
  if (depsData) {
    const depsMap = new Map<string, string[]>();
    depsData.forEach(dep => {
      const existing = depsMap.get(dep.task_id) || [];
      existing.push(dep.depends_on_id);
      depsMap.set(dep.task_id, existing);
    });
    
    tasks.forEach(task => {
      task.dependencies = depsMap.get(task.id) || [];
    });
  }
  
  return tasks;
};

export const createTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: task.projectId || null,
      name: task.name,
      phase: task.phase,
      assigned_to: task.assignedTo || null,
      start_date: task.startDate,
      duration: task.duration,
      progress: task.progress,
      status: task.status,
      priority: task.priority,
      parent_id: task.parentId || null,
      is_enterprise: task.isEnterprise || false,
      department: task.department,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }
  
  // Add dependencies if any
  if (task.dependencies && task.dependencies.length > 0) {
    await supabase
      .from('task_dependencies')
      .insert(
        task.dependencies.map(depId => ({
          task_id: data.id,
          depends_on_id: depId,
        }))
      );
  }
  
  return { ...mapDbTask(data), dependencies: task.dependencies || [] };
};

export const updateTask = async (task: Task): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      project_id: task.projectId || null,
      name: task.name,
      phase: task.phase,
      assigned_to: task.assignedTo || null,
      start_date: task.startDate,
      duration: task.duration,
      progress: task.progress,
      status: task.status,
      priority: task.priority,
      parent_id: task.parentId || null,
      is_enterprise: task.isEnterprise || false,
      department: task.department,
    })
    .eq('id', task.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }
  
  // Update dependencies - delete old, insert new
  await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', task.id);
  
  if (task.dependencies && task.dependencies.length > 0) {
    await supabase
      .from('task_dependencies')
      .insert(
        task.dependencies.map(depId => ({
          task_id: task.id,
          depends_on_id: depId,
        }))
      );
  }
  
  return { ...mapDbTask(data), dependencies: task.dependencies || [] };
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Users/Profiles
export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  
  return (data || []).map(mapDbUser);
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      name: user.name,
      email: user.email,
      access_code: user.accessCode,
      role: user.role,
      department_id: null, // TODO: lookup department by name
      avatar: user.avatar,
      is_active: user.isActive ?? true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  
  return mapDbUser(data);
};

export const updateUser = async (user: User): Promise<User> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: user.name,
      email: user.email,
      access_code: user.accessCode,
      role: user.role,
      avatar: user.avatar,
      is_active: user.isActive ?? true,
    })
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
  
  return mapDbUser(data);
};

export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  
  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Authenticate by access code
export const authenticateByAccessCode = async (accessCode: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('access_code', accessCode)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) {
    console.error('Error authenticating:', error);
    return null;
  }
  
  return data ? mapDbUser(data) : null;
};

// Departments
export const fetchDepartments = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('name')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
  
  return (data || []).map(d => d.name);
};

// Phases
export const fetchPhases = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('project_phases')
    .select('name')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching phases:', error);
    throw error;
  }
  
  return (data || []).map(p => p.name);
};

// Task Statuses
export const fetchTaskStatuses = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('task_statuses')
    .select('name')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching task statuses:', error);
    throw error;
  }
  
  return (data || []).map(s => s.name);
};

// System Config
export const fetchSystemConfig = async (key: string): Promise<any> => {
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching config:', error);
    return null;
  }
  
  return data?.value;
};

export const saveSystemConfig = async (key: string, value: any): Promise<void> => {
  const { error } = await supabase
    .from('system_config')
    .upsert({ key, value }, { onConflict: 'key' });
  
  if (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};

// Seed initial data if empty
export const seedInitialData = async (users: User[], projects: Project[], tasks: Task[]): Promise<void> => {
  // Check if profiles exist
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  
  if (existingProfiles && existingProfiles.length > 0) {
    console.log('Data already seeded');
    return;
  }
  
  console.log('Seeding initial data...');
  
  // Insert users
  for (const user of users) {
    await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: user.name,
        email: user.email,
        access_code: user.accessCode,
        role: user.role,
        avatar: user.avatar,
        is_active: user.isActive ?? true,
      });
  }
  
  // Insert projects
  for (const project of projects) {
    await supabase
      .from('projects')
      .insert({
        id: project.id,
        name: project.name,
        client: project.client,
        location: project.location,
        budget: project.budget,
        capacity_kw: project.capacityKW,
        start_date: project.startDate,
        status: project.status,
        progress: project.progress,
      });
  }
  
  // Insert tasks
  for (const task of tasks) {
    await supabase
      .from('tasks')
      .insert({
        id: task.id,
        project_id: task.projectId || null,
        name: task.name,
        phase: task.phase,
        assigned_to: task.assignedTo || null,
        start_date: task.startDate,
        duration: task.duration,
        progress: task.progress,
        status: task.status,
        priority: task.priority,
        parent_id: task.parentId || null,
        is_enterprise: task.isEnterprise || false,
        department: task.department,
      });
    
    // Insert dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        await supabase
          .from('task_dependencies')
          .insert({
            task_id: task.id,
            depends_on_id: depId,
          });
      }
    }
  }
  
  console.log('Initial data seeded successfully');
};
