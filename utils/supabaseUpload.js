// utils/supabaseUpload.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function uploadToSupabase(fileBuffer, fileName, folder, mimetype = 'image/jpeg') {
  const { data, error } = await supabase.storage
    .from(folder)
    .upload(fileName, fileBuffer, { contentType: mimetype });

  if (error) throw error;

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${folder}/${data.path}`;
}
