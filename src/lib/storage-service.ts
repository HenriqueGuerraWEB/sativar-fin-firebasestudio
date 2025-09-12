
"use client";

import { ApiService } from './api-service';

// This is the primary flag that determines the storage strategy.
// It is read from the public environment variables.
const isDatabaseEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === 'true';

// A custom type guard to check if a value is a Timestamp-like object
const isTimestampLike = (value: any): value is { seconds: number; nanoseconds: number } => {
    return value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number';
};

// Custom Replacer to handle Date objects, converting them to a serializable format for localStorage
const replacer = (key: any, value: any) => {
    if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
    }
    return value;
};

// Custom Reviver to convert our custom format back to Date objects from localStorage
const reviver = (key: any, value: any) => {
    if (value && value.__type === 'Date' && typeof value.value === 'string') {
        return new Date(value.value);
    }
    // Backward compatibility for old Timestamp format
    if (value && value.__type === 'Timestamp' && value.value) {
         if(isTimestampLike(value.value)) {
            return new Date(value.value.seconds * 1000 + value.value.nanoseconds / 1000000);
         }
    }
    // For backward compatibility for items stored directly as Timestamp-like objects
    if(isTimestampLike(value)){
        return new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    }
    return value;
};

// Define a generic type for storable items, must have an id.
export type Storable = { id: string; [key: string]: any };

// LocalStorage Implementation
// We export this so we can use it directly for migration preparation.
export const LocalStorageService = {
    getFullKey: (collectionKey: string) => `sativar-${collectionKey}`,

    getCollection: <T extends Storable>(collectionKey: string): T[] => {
        if (typeof window === 'undefined') return [];
        try {
            const storedData = localStorage.getItem(LocalStorageService.getFullKey(collectionKey));
            return storedData ? JSON.parse(storedData, reviver) : [];
        } catch (error) {
            console.error(`Error reading ${collectionKey} from localStorage:`, error);
            return [];
        }
    },

    setCollection: (collectionKey: string, data: any): void => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(LocalStorageService.getFullKey(collectionKey), JSON.stringify(data, replacer));
        } catch (error) {
            console.error(`Error writing ${collectionKey} to localStorage:`, error);
        }
    },

    getItem: <T extends Storable>(collectionKey: string, itemId: string): T | null => {
        const collection = LocalStorageService.getCollection<T>(collectionKey);
        return collection.find(item => item.id === itemId) || null;
    },

    addItem: <T extends Storable>(collectionKey: string, itemData: Omit<T, 'id'>): T => {
        const collection = LocalStorageService.getCollection<T>(collectionKey);
        const newItem = { ...itemData, id: crypto.randomUUID() } as T;
        const updatedCollection = [...collection, newItem];
        LocalStorageService.setCollection(collectionKey, updatedCollection);
        return newItem;
    },

    addItems: <T extends Storable>(collectionKey: string, itemsData: Omit<T, 'id'>[]): T[] => {
        const collection = LocalStorageService.getCollection<T>(collectionKey);
        const newItems = itemsData.map(itemData => ({ ...itemData, id: crypto.randomUUID() } as T));
        const updatedCollection = [...collection, ...newItems];
        LocalStorageService.setCollection(collectionKey, updatedCollection);
        return newItems;
    },

    updateItem: <T extends Storable>(collectionKey: string, itemId: string, updates: Partial<Omit<T, 'id'>>): T | null => {
        const collection = LocalStorageService.getCollection<T>(collectionKey);
        let updatedItem: T | null = null;
        const updatedCollection = collection.map(item => {
            if (item.id === itemId) {
                updatedItem = { ...item, ...updates };
                return updatedItem;
            }
            return item;
        });
        if (updatedItem) {
            LocalStorageService.setCollection(collectionKey, updatedCollection);
        }
        return updatedItem;
    },

    deleteItem: (collectionKey: string, itemId: string): void => {
        const collection = LocalStorageService.getCollection(collectionKey);
        const updatedCollection = collection.filter(item => item.id !== itemId);
        LocalStorageService.setCollection(collectionKey, updatedCollection);
    },

    deleteItems: (collectionKey: string, itemIds: string[]): void => {
        const collection = LocalStorageService.getCollection(collectionKey);
        const updatedCollection = collection.filter(item => !itemIds.includes(item.id));
        LocalStorageService.setCollection(collectionKey, updatedCollection);
    },
};

// This is the "bridge" or "selector". It exports the same interface
// but dynamically calls either the LocalStorage or ApiService implementation.
export const StorageService = {
    getCollection: async <T extends Storable>(collectionKey: string): Promise<T[]> => {
        return isDatabaseEnabled 
            ? await ApiService.getCollection<T>(collectionKey)
            : LocalStorageService.getCollection<T>(collectionKey);
    },
    setCollection: async (collectionKey: string, data: any): Promise<void> => {
         return isDatabaseEnabled 
            ? await ApiService.setCollection(collectionKey, data)
            : LocalStorageService.setCollection(collectionKey, data);
    },
    getItem: async <T extends Storable>(collectionKey: string, itemId: string): Promise<T | null> => {
         return isDatabaseEnabled 
            ? await ApiService.getItem<T>(collectionKey, itemId)
            : LocalStorageService.getItem<T>(collectionKey, itemId);
    },
    addItem: async <T extends Storable>(collectionKey: string, itemData: Omit<T, 'id'>): Promise<T> => {
         return isDatabaseEnabled 
            ? await ApiService.addItem<T>(collectionKey, itemData)
            : LocalStorageService.addItem<T>(collectionKey, itemData);
    },
    addItems: async <T extends Storable>(collectionKey: string, itemsData: Omit<T, 'id'>[]): Promise<T[]> => {
         return isDatabaseEnabled 
            ? await ApiService.addItems<T>(collectionKey, itemsData)
            : LocalStorageService.addItems<T>(collectionKey, itemsData);
    },
    updateItem: async <T extends Storable>(collectionKey: string, itemId: string, updates: Partial<Omit<T, 'id'>>): Promise<T | null> => {
         return isDatabaseEnabled 
            ? await ApiService.updateItem<T>(collectionKey, itemId, updates)
            : LocalStorageService.updateItem<T>(collectionKey, itemId, updates);
    },
    deleteItem: async (collectionKey: string, itemId: string): Promise<void> => {
         return isDatabaseEnabled 
            ? await ApiService.deleteItem(collectionKey, itemId)
            : LocalStorageService.deleteItem(collectionKey, itemId);
    },
    deleteItems: async (collectionKey: string, itemIds: string[]): Promise<void> => {
        return isDatabaseEnabled 
            ? await ApiService.deleteItems(collectionKey, itemIds)
            : LocalStorageService.deleteItems(collectionKey, itemIds);
    },
};

    