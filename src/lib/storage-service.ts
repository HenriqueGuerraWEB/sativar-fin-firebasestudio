
"use client"
import { Timestamp } from "firebase/firestore";

type Storable = { id: string; [key: string]: any };

const replacer = (key: any, value: any) => {
    if (value instanceof Timestamp) {
        return { __type: 'Timestamp', value: { seconds: value.seconds, nanoseconds: value.nanoseconds } };
    }
    return value;
};

const reviver = (key: any, value: any) => {
    if (value && value.__type === 'Timestamp') {
        return new Timestamp(value.value.seconds, value.value.nanoseconds);
    }
    return value;
};

const getFullKey = (collectionKey: string) => `sativar-${collectionKey}`;

const getCollection = <T extends Storable>(collectionKey: string): T[] => {
    if (typeof window === 'undefined') return [];
    try {
        const storedData = localStorage.getItem(getFullKey(collectionKey));
        return storedData ? JSON.parse(storedData, reviver) : [];
    } catch (error) {
        console.error(`Error reading ${collectionKey} from localStorage:`, error);
        return [];
    }
};

const setCollection = (collectionKey: string, data: any): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(getFullKey(collectionKey), JSON.stringify(data, replacer));
    } catch (error) {
        console.error(`Error writing ${collectionKey} to localStorage:`, error);
    }
};

const getItem = <T extends Storable>(collectionKey: string, itemId: string): T | null => {
    const collection = getCollection<T>(collectionKey);
    return collection.find(item => item.id === itemId) || null;
};

const addItem = <T extends Storable>(collectionKey: string, itemData: Omit<T, 'id'>): T => {
    const collection = getCollection<T>(collectionKey);
    const newItem = { ...itemData, id: crypto.randomUUID() } as T;
    const updatedCollection = [...collection, newItem];
    setCollection(collectionKey, updatedCollection);
    return newItem;
};

const addItems = <T extends Storable>(collectionKey: string, itemsData: Omit<T, 'id'>[]): T[] => {
    const collection = getCollection<T>(collectionKey);
    const newItems = itemsData.map(itemData => ({ ...itemData, id: crypto.randomUUID() } as T));
    const updatedCollection = [...collection, ...newItems];
    setCollection(collectionKey, updatedCollection);
    return newItems;
};

const updateItem = <T extends Storable>(collectionKey: string, itemId: string, updates: Partial<Omit<T, 'id'>>): T | null => {
    const collection = getCollection<T>(collectionKey);
    let updatedItem: T | null = null;
    const updatedCollection = collection.map(item => {
        if (item.id === itemId) {
            updatedItem = { ...item, ...updates };
            return updatedItem;
        }
        return item;
    });
    if (updatedItem) {
        setCollection(collectionKey, updatedCollection);
    }
    return updatedItem;
};

const deleteItem = (collectionKey: string, itemId: string): void => {
    const collection = getCollection(collectionKey);
    const updatedCollection = collection.filter(item => item.id !== itemId);
    setCollection(collectionKey, updatedCollection);
};

const deleteItems = (collectionKey: string, itemIds: string[]): void => {
    const collection = getCollection(collectionKey);
    const updatedCollection = collection.filter(item => !itemIds.includes(item.id));
    setCollection(collectionKey, updatedCollection);
};


export const StorageService = {
    getCollection,
    setCollection,
    getItem,
    addItem,
    addItems,
    updateItem,
    deleteItem,
    deleteItems,
};
