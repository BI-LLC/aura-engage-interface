-- Fix security issue: Restrict tenant_users access to individual records only
-- Current policy allows all tenant users to see each other's data
-- New policies: users can only see their own data, admins can see all tenant data

-- Drop the overly permissive existing policy
DROP POLICY IF EXISTS "Users can only access their tenant's users" ON public.tenant_users;

-- Create restrictive policy: users can only see their own record
CREATE POLICY "Users can view their own record only" 
ON public.tenant_users 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create policy: users can only update their own record
CREATE POLICY "Users can update their own record only" 
ON public.tenant_users 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Create admin policy: admins can view all users in any tenant
CREATE POLICY "Admins can view all tenant users" 
ON public.tenant_users 
FOR SELECT 
TO authenticated
USING (current_user_is_admin());

-- Create admin policy: admins can insert new tenant users
CREATE POLICY "Admins can insert tenant users" 
ON public.tenant_users 
FOR INSERT 
TO authenticated
WITH CHECK (current_user_is_admin());

-- Create admin policy: admins can update any tenant user
CREATE POLICY "Admins can update any tenant user" 
ON public.tenant_users 
FOR UPDATE 
TO authenticated
USING (current_user_is_admin());

-- Create admin policy: admins can delete tenant users
CREATE POLICY "Admins can delete tenant users" 
ON public.tenant_users 
FOR DELETE 
TO authenticated
USING (current_user_is_admin());