-- Grant execute permission on ensure_profile_and_supplier to authenticated users
-- This prevents 400 errors when the function is called by authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_profile_and_supplier(uuid) TO authenticated;