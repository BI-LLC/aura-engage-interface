-- Security Enhancement: Strengthen RLS policies for tenant_users table
-- This fixes potential issues with admin access and ensures proper tenant isolation

-- First, let's create a more secure function to check if user is admin
-- that includes proper search_path setting
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin(auth.uid());
$$;

-- Update the is_admin function to also have proper search_path
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin'
  );
$$;

-- Create a function to check if a user belongs to the same tenant as the viewing user
CREATE OR REPLACE FUNCTION public.is_same_tenant_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_users tu1
    JOIN public.tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
    WHERE tu1.user_id = auth.uid() 
    AND tu2.user_id = target_user_id
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all tenant users" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can view their own record only" ON public.tenant_users;
DROP POLICY IF EXISTS "Admins can update any tenant user" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can update their own record only" ON public.tenant_users;

-- Create more restrictive and secure policies
-- Users can only view their own record (no tenant-wide access)
CREATE POLICY "Users can view their own record only" 
ON public.tenant_users 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all tenant users (but only if they are admin)
CREATE POLICY "Admins can view all tenant users" 
ON public.tenant_users 
FOR SELECT 
TO authenticated
USING (current_user_is_admin());

-- Users can only update their own record
CREATE POLICY "Users can update their own record only" 
ON public.tenant_users 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any tenant user
CREATE POLICY "Admins can update any tenant user" 
ON public.tenant_users 
FOR UPDATE 
TO authenticated
USING (current_user_is_admin());

-- Add audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_tenant_user_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to tenant_users table for audit purposes
  INSERT INTO public.document_access_logs (
    user_id, 
    tenant_id, 
    access_type, 
    doc_id,
    timestamp
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    TG_OP,
    gen_random_uuid(), -- placeholder for log tracking
    NOW()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for audit logging (optional - only if you want detailed audit logs)
-- DROP TRIGGER IF EXISTS tenant_user_access_log ON public.tenant_users;
-- CREATE TRIGGER tenant_user_access_log
--   AFTER INSERT OR UPDATE OR DELETE ON public.tenant_users
--   FOR EACH ROW EXECUTE FUNCTION public.log_tenant_user_access();