-- Create table for reference materials uploaded by admins
CREATE TABLE public.reference_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content TEXT, -- Extracted text content for searching
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reference_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for reference materials
CREATE POLICY "Only admins can view reference materials" 
ON public.reference_materials 
FOR SELECT 
USING (current_user_is_admin());

CREATE POLICY "Only admins can insert reference materials" 
ON public.reference_materials 
FOR INSERT 
WITH CHECK (current_user_is_admin());

CREATE POLICY "Only admins can update reference materials" 
ON public.reference_materials 
FOR UPDATE 
USING (current_user_is_admin());

CREATE POLICY "Only admins can delete reference materials" 
ON public.reference_materials 
FOR DELETE 
USING (current_user_is_admin());

-- Create table for logic notes
CREATE TABLE public.logic_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logic_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for logic notes
CREATE POLICY "Only admins can view logic notes" 
ON public.logic_notes 
FOR SELECT 
USING (current_user_is_admin());

CREATE POLICY "Only admins can insert logic notes" 
ON public.logic_notes 
FOR INSERT 
WITH CHECK (current_user_is_admin());

CREATE POLICY "Only admins can update logic notes" 
ON public.logic_notes 
FOR UPDATE 
USING (current_user_is_admin());

CREATE POLICY "Only admins can delete logic notes" 
ON public.logic_notes 
FOR DELETE 
USING (current_user_is_admin());

-- Add triggers for updated_at
CREATE TRIGGER update_reference_materials_updated_at
BEFORE UPDATE ON public.reference_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_logic_notes_updated_at
BEFORE UPDATE ON public.logic_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for reference materials
INSERT INTO storage.buckets (id, name, public) VALUES ('reference-materials', 'reference-materials', false);

-- Create storage policies for reference materials
CREATE POLICY "Admins can view reference materials" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reference-materials' AND current_user_is_admin());

CREATE POLICY "Admins can upload reference materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'reference-materials' AND current_user_is_admin());

CREATE POLICY "Admins can update reference materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'reference-materials' AND current_user_is_admin());

CREATE POLICY "Admins can delete reference materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'reference-materials' AND current_user_is_admin());