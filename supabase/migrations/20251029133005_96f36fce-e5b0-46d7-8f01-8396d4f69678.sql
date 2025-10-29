-- Create query_types table for customizable categories
CREATE TABLE public.query_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create queries table
CREATE TABLE public.queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  query_type_id UUID REFERENCES public.query_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.query_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for query_types
CREATE POLICY "Users can view their own query types"
  ON public.query_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own query types"
  ON public.query_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own query types"
  ON public.query_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own query types"
  ON public.query_types FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for queries
CREATE POLICY "Users can view their own queries"
  ON public.queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own queries"
  ON public.queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queries"
  ON public.queries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queries"
  ON public.queries FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on queries
CREATE TRIGGER update_queries_updated_at
  BEFORE UPDATE ON public.queries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_queries_user_id ON public.queries(user_id);
CREATE INDEX idx_queries_status ON public.queries(status);
CREATE INDEX idx_queries_query_type_id ON public.queries(query_type_id);
CREATE INDEX idx_query_types_user_id ON public.query_types(user_id);