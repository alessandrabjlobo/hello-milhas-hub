-- Drop and recreate ensure_profile_and_supplier to use UUID without creating fake suppliers
DROP FUNCTION IF EXISTS public.ensure_profile_and_supplier(uuid);

CREATE OR REPLACE FUNCTION public.ensure_profile_and_supplier(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid;
  v_user_email text;
  v_profile_exists boolean;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users WHERE id = p_user_id;

  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Profile exists, get its supplier_id
    SELECT supplier_id INTO v_supplier_id
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- If no supplier_id exists, generate a unique UUID (this acts as agency_id)
    IF v_supplier_id IS NULL THEN
      v_supplier_id := gen_random_uuid();
      
      -- Update profile with new agency_id (stored in supplier_id column)
      UPDATE public.profiles
      SET supplier_id = v_supplier_id
      WHERE id = p_user_id;
    END IF;
    
    RETURN v_supplier_id;
  ELSE
    -- Generate a unique UUID for this agency
    v_supplier_id := gen_random_uuid();
    
    -- Create new profile with unique agency_id
    INSERT INTO public.profiles (id, email, full_name, supplier_id)
    VALUES (
      p_user_id, 
      v_user_email, 
      COALESCE(v_user_email, 'Usuário'),
      v_supplier_id
    );
    
    RETURN v_supplier_id;
  END IF;
END;
$function$;

-- Add comment to clarify that supplier_id is actually agency_id
COMMENT ON COLUMN public.profiles.supplier_id IS 'UUID that identifies the agency (tenant). This is NOT a foreign key to suppliers table. Suppliers table is for mileage suppliers managed by the agency.';