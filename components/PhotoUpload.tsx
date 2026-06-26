'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { uploadAvatar } from '@/lib/supabase';

interface PhotoUploadProps {
  currentUrl?: string;
  name?: string;
  folder: 'eleves' | 'enseignants';
  entityId: string;
  onUpload: (url: string) => void;
  size?: 'sm' | 'lg';
}

export default function PhotoUpload({
  currentUrl, name, folder, entityId, onUpload, size = 'lg'
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const dim = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  const iconSize = size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-base';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifications
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }

    // Preview local immédiat
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload Supabase
    setUploading(true);
    try {
      const url = await uploadAvatar(file, folder, entityId);
      if (url) {
        setPreview(url);
        onUpload(url);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${dim} cursor-pointer group`} onClick={() => inputRef.current?.click()}>
        {/* Avatar ou initiales */}
        <div className={`${dim} rounded-full overflow-hidden bg-[#1B3A6B] flex items-center justify-center border-4 border-white shadow-lg`}>
          {preview ? (
            <img src={preview} alt="Photo" className="w-full h-full object-cover" />
          ) : (
            <span className={`text-white font-bold ${textSize}`}>{initials}</span>
          )}
        </div>

        {/* Overlay hover */}
        <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Badge caméra */}
        <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow">
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <p className="text-xs text-gray-400">
        {uploading ? 'Upload en cours...' : 'Cliquer pour changer la photo'}
      </p>
    </div>
  );
}