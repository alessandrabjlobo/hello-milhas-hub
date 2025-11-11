-- Grant necessary privileges to authenticated role for mileage_accounts and airline_companies
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant full CRUD on mileage_accounts
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mileage_accounts TO authenticated;

-- Grant SELECT on airline_companies (for embeds)
GRANT SELECT ON TABLE public.airline_companies TO authenticated;

-- Grant usage on sequences (for future-proofing)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;