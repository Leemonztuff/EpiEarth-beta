
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ENABLE_CLOUD_SAVES } from '../config';

// Singleton instance
let supabaseInstance: any = null;

export const getSupabase = () => {
    if (!ENABLE_CLOUD_SAVES) return null;
    
    if (!supabaseInstance) {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseInstance;
};

/**
 * Sube una imagen al bucket 'game-assets' y retorna su URL pública.
 */
export const uploadAsset = async (file: File, folder: string = 'sprites'): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;

    const fileName = `${folder}/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    
    try {
        const { data, error } = await supabase.storage
            .from('game-assets')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('game-assets')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (e: any) {
        console.error("Upload failed:", e.message);
        alert("Error al subir imagen: " + e.message);
        return null;
    }
};
