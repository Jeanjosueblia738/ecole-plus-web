import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkllqejigjzjpwkmdmte.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadAvatar(file: File, folder: string, id: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${id}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}