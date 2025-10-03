import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cheuedunbbtnmlgvmhyg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZXVlZHVuYmJ0bm1sZ3ZtaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjMwMTAsImV4cCI6MjA3MjEzOTAxMH0.9Yvf8UKfhXbKhy69081WwFlHZ9tZOAWjWKtR-PlbKJQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event) => {
  try {
    const path = event.queryStringParameters?.path;
    if (!path) {
      return { statusCode: 400, body: JSON.stringify({ error: "Path is required" }) };
    }

    const { data, error } = await supabase.storage.from("workorder").download(path);
    if (error || !data) {
      return { statusCode: 404, body: JSON.stringify({ error: "File not found" }) };
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = "application/octet-stream";
    if (path.endsWith(".pdf")) contentType = "application/pdf";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) contentType = "image/jpeg";
    if (path.endsWith(".png")) contentType = "image/png";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.split("/").pop()}"`,
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
