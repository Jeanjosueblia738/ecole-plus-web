import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

const supabaseUrl = 'https://lkllqejigjzjpwkmdmte.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadAvatar(file: File, folder: string, id: string): Promise<string | null> {
  // Exige une session école (évite upload anonyme depuis une page publique)
  // Tokens JWT sont httpOnly — on vérifie la présence du profil session
  if (!Cookies.get('ecole_user') && !Cookies.get('sa_user')) {
    console.error('Upload refusé : utilisateur non authentifié');
    return null;
  }

  if (!id || id.includes('..') || id.includes('/')) {
    console.error('Upload refusé : id invalide');
    return null;
  }

  const allowedFolders = new Set(['eleves', 'enseignants', 'admins']);
  if (!allowedFolders.has(folder)) {
    console.error('Upload refusé : dossier invalide');
    return null;
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
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
