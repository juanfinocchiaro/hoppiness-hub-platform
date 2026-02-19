-- Add unique constraint for upsert operations on branch_permissions
ALTER TABLE public.branch_permissions 
ADD CONSTRAINT branch_permissions_user_branch_unique UNIQUE (user_id, branch_id);