const SUPABASE_URL = 'https://caoiohmdixmdowmrmabv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhb2lvaG1kaXhtZG93bXJtYWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDU1NjMsImV4cCI6MjEwMzQyMTU2M30.76XXriGmKln6O_GHVZPBHV8Tf5CEmmRDOuvMlWLHAZA';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
