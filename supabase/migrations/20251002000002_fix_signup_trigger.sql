-- Fix signup by attaching handle_new_user trigger to auth.users table
-- This trigger auto-creates tenant and profile when a new user signs up

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions for the trigger to work
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates tenant and profile when new user signs up';
