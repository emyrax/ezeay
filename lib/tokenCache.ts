import { TokenCache } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const tokenCache: TokenCache = {
  async getToken(key: string): Promise<string | undefined | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Clerk Token Cache - Get Error:', err);
      return null;
    }
  },

  async saveToken(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Clerk Token Cache - Save Error:', err);
    }
  },

  clearToken(key: string): void {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      SecureStore.deleteItemAsync(key).catch((err) => {
        console.error('Clerk Token Cache - Async Delete Error:', err);
      });
    } catch (err) {
      console.error('Clerk Token Cache - Clear Error:', err);
    }
  }
};

