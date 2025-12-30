import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cheuedunbbtnmlgvmhyg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZXVlZHVuYmJ0bm1sZ3ZtaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjMwMTAsImV4cCI6MjA3MjEzOTAxMH0.9Yvf8UKfhXbKhy69081WwFlHZ9tZOAWjWKtR-PlbKJQ"
);

const { data, error } = await supabase.from("cctv").select("*").limit(1);
console.log({ data, error });
