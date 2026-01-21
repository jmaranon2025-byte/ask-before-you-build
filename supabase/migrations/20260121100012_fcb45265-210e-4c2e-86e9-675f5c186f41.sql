-- Create specialties table
CREATE TABLE public.specialties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create roles table (roles within specialties)
CREATE TABLE public.specialty_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(specialty_id, name)
);

-- Create user_specialties junction table (users can have multiple specialties with roles)
CREATE TABLE public.user_specialties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.specialty_roles(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, specialty_id, role_id)
);

-- Add task requirements for specialty and role
ALTER TABLE public.tasks 
ADD COLUMN required_specialty_id UUID REFERENCES public.specialties(id),
ADD COLUMN required_role_id UUID REFERENCES public.specialty_roles(id),
ADD COLUMN scheduled_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN scheduled_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_critical BOOLEAN DEFAULT false,
ADD COLUMN workload_hours NUMERIC DEFAULT 8;

-- Create workload tracking table
CREATE TABLE public.workload_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    hours_assigned NUMERIC NOT NULL DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, task_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialty_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for specialties
CREATE POLICY "Allow public read on specialties" ON public.specialties FOR SELECT USING (true);
CREATE POLICY "Allow public insert on specialties" ON public.specialties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on specialties" ON public.specialties FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on specialties" ON public.specialties FOR DELETE USING (true);

-- RLS policies for specialty_roles
CREATE POLICY "Allow public read on specialty_roles" ON public.specialty_roles FOR SELECT USING (true);
CREATE POLICY "Allow public insert on specialty_roles" ON public.specialty_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on specialty_roles" ON public.specialty_roles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on specialty_roles" ON public.specialty_roles FOR DELETE USING (true);

-- RLS policies for user_specialties
CREATE POLICY "Allow public read on user_specialties" ON public.user_specialties FOR SELECT USING (true);
CREATE POLICY "Allow public insert on user_specialties" ON public.user_specialties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on user_specialties" ON public.user_specialties FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on user_specialties" ON public.user_specialties FOR DELETE USING (true);

-- RLS policies for workload_assignments
CREATE POLICY "Allow public read on workload_assignments" ON public.workload_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on workload_assignments" ON public.workload_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on workload_assignments" ON public.workload_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on workload_assignments" ON public.workload_assignments FOR DELETE USING (true);