
"use client"

// A custom type guard to check if a value is a Timestamp-like object
const isTimestampLike = (value: any): value is { seconds: number; nanoseconds: number } => {
    return value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number';
};


// Custom Replacer to handle Date objects, converting them to a serializable format
const replacer = (key: any, value: any) => {
    // If the value is a Date object, convert it to our custom format
    if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
    }
    return value;
};


// Custom Reviver to convert our custom format back to Date objects
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
type Storable = { id: string; [key: string]: any };

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
