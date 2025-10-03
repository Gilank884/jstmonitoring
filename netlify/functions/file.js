import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cheuedunbbtnmlgvmhyg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZXVlZHVuYmJ0bm1sZ3ZtaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjMwMTAsImV4cCI6MjA3MjEzOTAxMH0.9Yvf8UKfhXbKhy69081WwFlHZ9tZOAWjWKtR-PlbKJQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event) => {
  try {
    const path = event.queryStringParameters?.path;
    if (!path) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Path is required" }),
      };
    }

    // generate signed URL (valid 1 menit)
    const { data, error } = await supabase.storage
      .from("workorder")
      .createSignedUrl(path, 60);

    if (error || !data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "File not found" }),
      };
    }

    // redirect langsung ke Supabase signed URL
    return {
      statusCode: 302,
      headers: {
        Location: data.signedUrl,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
