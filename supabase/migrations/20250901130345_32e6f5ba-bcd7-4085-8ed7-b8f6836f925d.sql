-- Create training_data table for AI training interface
CREATE TABLE public.training_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (admin-only page)
CREATE POLICY "Allow all operations on training_data" 
ON public.training_data 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_training_data_updated_at
BEFORE UPDATE ON public.training_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();