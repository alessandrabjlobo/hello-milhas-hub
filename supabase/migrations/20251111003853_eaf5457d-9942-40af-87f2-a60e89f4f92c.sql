-- Drop and recreate the ensure_profile_and_supplier function to create unique suppliers
DROP FUNCTION IF EXISTS public.ensure_profile_and_supplier(uuid);

CREATE OR REPLACE FUNCTION public.ensure_profile_and_supplier(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    
    -- If no supplier exists, create one
    IF v_supplier_id IS NULL THEN
      INSERT INTO public.suppliers (id, name, phone, payment_type, user_id)
      VALUES (
        gen_random_uuid(),
        COALESCE(v_user_email, 'Agência'),
        '',
        'per_use',
        p_user_id
      )
      RETURNING id INTO v_supplier_id;
      
      -- Update profile with new supplier_id
      UPDATE public.profiles
      SET supplier_id = v_supplier_id
      WHERE id = p_user_id;
    END IF;
    
    RETURN v_supplier_id;
  ELSE
    -- Create new supplier for this user
    INSERT INTO public.suppliers (id, name, phone, payment_type, user_id)
    VALUES (
      gen_random_uuid(),
      COALESCE(v_user_email, 'Agência'),
      '',
      'per_use',
      p_user_id
    )
    RETURNING id INTO v_supplier_id;
    
    -- Create new profile with unique supplier
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
$$;