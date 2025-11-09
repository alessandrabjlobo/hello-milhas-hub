-- Update cpf_period to support calendar_year and rolling_year
-- First, update existing data to new values
UPDATE agency_program_settings 
SET cpf_period = CASE 
  WHEN cpf_period = 'month' THEN 'calendar_year'
  WHEN cpf_period = 'day' THEN 'rolling_year'
  ELSE cpf_period
END;

-- Alter the column to text to remove constraint temporarily
ALTER TABLE agency_program_settings 
ALTER COLUMN cpf_period TYPE text;

-- Update default
ALTER TABLE agency_program_settings 
ALTER COLUMN cpf_period SET DEFAULT 'calendar_year';