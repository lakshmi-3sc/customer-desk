import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload a file to Supabase Storage
 * @param file - The File object to upload
 * @param ticketId - The ticket ID for organizing storage
 * @returns URL of the uploaded file
 */
export async function uploadFileToSupabase(
  file: File,
  ticketId: string
): Promise<string> {
  try {
    // Create a unique filename to avoid conflicts
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}-${randomStr}-${sanitizedName}`;

    // Upload to Supabase Storage in 'ticket-attachments' bucket
    const { data, error } = await supabase.storage
      .from("ticket-attachments")
      .upload(`${ticketId}/${uniqueFileName}`, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get the public URL of the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("ticket-attachments")
      .getPublicUrl(`${ticketId}/${uniqueFileName}`);

    return publicUrl;
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of File objects
 * @param ticketId - The ticket ID for organizing storage
 * @returns Array of file URLs and metadata
 */
export async function uploadFilesToSupabase(
  files: File[],
  ticketId: string
): Promise<Array<{ url: string; name: string; size: number; type: string }>> {
  try {
    const uploadPromises = files.map((file) =>
      uploadFileToSupabase(file, ticketId).then((url) => ({
        url,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      }))
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Batch file upload error:", error);
    throw error;
  }
}
