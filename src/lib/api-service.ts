
"use client";

import type { Storable } from './storage-service';
// Import your Genkit flows here
import { 
    getPlans, 
    addPlan, 
    updatePlan,
    deletePlan,
    Plan, 
    AddPlanInput,
    UpdatePlanInput,
} from '@/ai/flows/plans-flow';

/**
 * ApiService
 * This service acts as the client-side adapter for database operations.
 * It mirrors the interface of the LocalStorageService but calls backend API endpoints (Genkit flows).
 */
export const ApiService = {
    getCollection: async <T extends Storable>(collectionKey: string): Promise<T[]> => {
        console.log(`ApiService: Fetching collection ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                return await getPlans() as T[];
            // Add cases for other collections here as flows are created
            // case 'clients':
            //     return await getClients() as T[];
            default:
                console.warn(`ApiService: No getCollection handler for ${collectionKey}`);
                return Promise.resolve([]);
        }
    },

    setCollection: async (collectionKey: string, data: any): Promise<void> => {
        console.log(`ApiService: Setting collection ${collectionKey}...`);
        // This would likely be a bulk-update or migration endpoint.
        // To be implemented if needed.
        return Promise.resolve();
    },

    getItem: async <T extends Storable>(collectionKey: string, itemId: string): Promise<T | null> => {
        console.log(`ApiService: Fetching item ${itemId} from ${collectionKey}...`);
        // This is inefficient. It's better to create specific `getItem` flows.
        const collection = await ApiService.getCollection<T>(collectionKey);
        return Promise.resolve(collection.find(item => item.id === itemId) || null);
    },

    addItem: async <T extends Storable>(collectionKey: string, itemData: Omit<T, 'id'>): Promise<T> => {
        console.log(`ApiService: Adding item to ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                return await addPlan(itemData as AddPlanInput) as T;
            default:
                console.warn(`ApiService: No addItem handler for ${collectionKey}`);
                // Returning a mock object for now to avoid breaking hooks' expectations.
                return Promise.resolve({ ...itemData, id: 'temp-api-id' } as T);
        }
    },

    addItems: async <T extends Storable>(collectionKey: string, itemsData: Omit<T, 'id'>[]): Promise<T[]> => {
        console.log(`ApiService: Adding multiple items to ${collectionKey}...`);
        // This should be implemented with a dedicated bulk-add flow for efficiency.
        const results = await Promise.all(itemsData.map(item => ApiService.addItem<T>(collectionKey, item)));
        return results;
    },

    updateItem: async <T extends Storable>(collectionKey: string, itemId: string, updates: Partial<Omit<T, 'id'>>): Promise<T | null> => {
        console.log(`ApiService: Updating item ${itemId} in ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                const input: UpdatePlanInput = { planId: itemId, updates: updates as Partial<Plan> };
                return await updatePlan(input) as T | null;
            default:
                 console.warn(`ApiService: No updateItem handler for ${collectionKey}`);
                 return Promise.resolve(null);
        }
    },

    deleteItem: async (collectionKey: string, itemId: string): Promise<void> => {
        console.log(`ApiService: Deleting item ${itemId} from ${collectionKey}...`);
        switch (collectionKey) {
            case 'plans':
                return await deletePlan(itemId);
            default:
                console.warn(`ApiService: No deleteItem handler for ${collectionKey}`);
                return Promise.resolve();
        }
    },

    deleteItems: async (collectionKey: string, itemIds: string[]): Promise<void> => {
        console.log(`ApiService: Deleting multiple items from ${collectionKey}...`);
        // This should be implemented with a dedicated bulk-delete flow for efficiency.
        await Promise.all(itemIds.map(id => ApiService.deleteItem(collectionKey, id)));
        return Promise.resolve();
    },
};
