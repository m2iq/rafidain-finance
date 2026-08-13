import { supabase } from '../supabase/supabaseClient';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

export interface AppUpdate {
  id: string;
  version: string;
  version_code: number;
  release_notes: string;
  download_url: string;
  is_mandatory: boolean;
  created_at: string;
}

export const CURRENT_VERSION_CODE = 2; // You can increment this number on every store release

export const checkForUpdates = async (): Promise<AppUpdate | null> => {
  try {
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .order('version_code', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // not found
        console.error('[Updates] Error fetching updates:', error);
      }
      return null;
    }

    if (data && data.version_code > CURRENT_VERSION_CODE) {
      return data as AppUpdate;
    }

    return null;
  } catch (error) {
    console.error('[Updates] Error in checkForUpdates:', error);
    return null;
  }
};

export const installApk = async (localUri: string): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const contentUri = await getContentUriAsync(localUri);
    
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: 'application/vnd.android.package-archive',
    });
    return true;
  } catch (error) {
    console.error('[Updates] Error launching intent to install APK:', error);
    return false;
  }
};
