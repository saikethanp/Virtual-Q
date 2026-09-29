import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogqapklbgdhjbcpxgflz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWFwa2xiZ2RoamJjcHhnZmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTI5NjcsImV4cCI6MjEwNjE2ODk2N30.1uyiz47bt56b-f7rmV7SHqA3wrHglW0twJl_BvmhIzk';

export const supabase = createClient(supabaseUrl, supabaseKey);
