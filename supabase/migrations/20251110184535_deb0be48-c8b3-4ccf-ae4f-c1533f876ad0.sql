-- Fix ensure_profile_and_supplier function to create supplier before profile
-- This prevents NOT NULL constraint violation on profiles.supplier_id

create or replace function public.ensure_profile_and_supplier(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier_id uuid;
  v_user_email text;
  v_profile_exists boolean;
begin
  -- Get user email from auth.users
  select email into v_user_email
  from auth.users where id = p_user_id;

  -- Check if profile already exists
  select exists(select 1 from public.profiles where id = p_user_id) into v_profile_exists;
  
  if v_profile_exists then
    -- Profile exists, get supplier_id
    select supplier_id into v_supplier_id
    from public.profiles where id = p_user_id;
    
    -- If supplier_id is null, create supplier and update profile
    if v_supplier_id is null then
      insert into public.suppliers (name, phone, user_id)
      values (
        coalesce(v_user_email, 'Minha Agência'),
        '',
        p_user_id
      )
      returning id into v_supplier_id;
      
      update public.profiles
      set supplier_id = v_supplier_id
      where id = p_user_id;
    end if;
    
    return v_supplier_id;
  else
    -- Profile doesn't exist, create supplier first
    insert into public.suppliers (name, phone, user_id)
    values (
      coalesce(v_user_email, 'Minha Agência'),
      '',
      p_user_id
    )
    returning id into v_supplier_id;

    -- Then create profile with supplier_id
    insert into public.profiles (id, email, full_name, supplier_id)
    values (
      p_user_id, 
      v_user_email, 
      coalesce(v_user_email, 'Usuário'),
      v_supplier_id
    );
    
    return v_supplier_id;
  end if;
end $$;