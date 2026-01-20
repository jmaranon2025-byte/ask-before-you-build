-- Crear enum para roles de aplicación
CREATE TYPE public.app_role AS ENUM ('admin', 'project_manager', 'engineer', 'viewer');

-- Crear enum para prioridad
CREATE TYPE public.task_priority AS ENUM ('Crítica', 'Alta', 'Media', 'Baja');

-- Crear enum para estado de proyecto
CREATE TYPE public.project_status AS ENUM ('Planificación', 'En Progreso', 'Completado', 'Detenido', 'Cancelado');

-- Tabla de departamentos
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    access_code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Viewer',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de proyectos
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    location TEXT,
    budget DECIMAL(12,2) DEFAULT 0,
    capacity_kw DECIMAL(10,1) DEFAULT 0,
    start_date DATE NOT NULL,
    status project_status DEFAULT 'Planificación',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de fases de proyecto
CREATE TABLE public.project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de estados de tarea
CREATE TABLE public.task_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de tareas
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phase TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    duration INTEGER DEFAULT 1 CHECK (duration >= 1),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'Pendiente',
    priority task_priority DEFAULT 'Media',
    parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    is_enterprise BOOLEAN DEFAULT false,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de dependencias de tareas
CREATE TABLE public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(task_id, depends_on_id),
    CHECK (task_id != depends_on_id)
);

-- Tabla de configuración del sistema
CREATE TABLE public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para lectura (sin autenticación tradicional)
CREATE POLICY "Allow public read on departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read on projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public read on project_phases" ON public.project_phases FOR SELECT USING (true);
CREATE POLICY "Allow public read on task_statuses" ON public.task_statuses FOR SELECT USING (true);
CREATE POLICY "Allow public read on tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read on task_dependencies" ON public.task_dependencies FOR SELECT USING (true);
CREATE POLICY "Allow public read on system_config" ON public.system_config FOR SELECT USING (true);

-- Políticas para insertar/actualizar/eliminar (públicas por ahora, se restringirán con Edge Functions)
CREATE POLICY "Allow public insert on departments" ON public.departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on departments" ON public.departments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on departments" ON public.departments FOR DELETE USING (true);

CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on profiles" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "Allow public insert on projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on projects" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Allow public insert on project_phases" ON public.project_phases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on project_phases" ON public.project_phases FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on project_phases" ON public.project_phases FOR DELETE USING (true);

CREATE POLICY "Allow public insert on task_statuses" ON public.task_statuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on task_statuses" ON public.task_statuses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on task_statuses" ON public.task_statuses FOR DELETE USING (true);

CREATE POLICY "Allow public insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Allow public insert on task_dependencies" ON public.task_dependencies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on task_dependencies" ON public.task_dependencies FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on task_dependencies" ON public.task_dependencies FOR DELETE USING (true);

CREATE POLICY "Allow public insert on system_config" ON public.system_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on system_config" ON public.system_config FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on system_config" ON public.system_config FOR DELETE USING (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar departamentos iniciales
INSERT INTO public.departments (name) VALUES 
    ('Dirección'),
    ('Ingeniería'),
    ('Legal'),
    ('Operaciones'),
    ('Compras');

-- Insertar fases de proyecto iniciales
INSERT INTO public.project_phases (name, sort_order) VALUES 
    ('Preparación y Planificación', 1),
    ('Ingeniería y Diseño', 2),
    ('Suministro y Logística', 3),
    ('Ejecución y Montaje', 4),
    ('Pruebas y Puesta en Marcha', 5),
    ('Entrega', 6);

-- Insertar estados de tarea iniciales
INSERT INTO public.task_statuses (name, sort_order) VALUES 
    ('Pendiente', 1),
    ('En Progreso', 2),
    ('Completado', 3),
    ('En Riesgo', 4),
    ('Cancelado', 5);