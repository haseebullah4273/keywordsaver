-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Add project_id to main_targets
ALTER TABLE public.main_targets ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add project_id to folders
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.folders(id) ON DELETE CASCADE;

-- Update RLS policies for main_targets to include project ownership
DROP POLICY IF EXISTS "Users can manage their own targets" ON public.main_targets;

CREATE POLICY "Users can view their own targets"
  ON public.main_targets FOR SELECT
  USING (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = main_targets.project_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create their own targets"
  ON public.main_targets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = main_targets.project_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their own targets"
  ON public.main_targets FOR UPDATE
  USING (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = main_targets.project_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their own targets"
  ON public.main_targets FOR DELETE
  USING (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = main_targets.project_id AND user_id = auth.uid()
    ))
  );

-- Update RLS policies for folders to include project ownership
DROP POLICY IF EXISTS "Users can manage their own folders" ON public.folders;

CREATE POLICY "Users can view their own folders"
  ON public.folders FOR SELECT
  USING (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = folders.project_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create their own folders"
  ON public.folders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = folders.project_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their own folders"
  ON public.folders FOR UPDATE
  USING (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = folders.project_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their own folders"
  ON public.folders FOR DELETE
  USING (
    auth.uid() = user_id AND
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = folders.project_id AND user_id = auth.uid()
    ))
  );

-- Add trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();