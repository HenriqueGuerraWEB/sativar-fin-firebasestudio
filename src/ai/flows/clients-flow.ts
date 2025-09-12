
'use server';
/**
 * @fileOverview Genkit flows for managing clients.
 * 
 * - getClients - Retrieves all clients.
 * - addClient - Adds a new client.
 * - updateClient - Updates an existing client.
 * - deleteClient - Deletes a client.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { 
    ClientSchema,
    Client,
    AddClientInputSchema,
    AddClientInput,
    UpdateClientInputSchema 
} from '@/lib/types/client-types';


// Flow to get all clients
export const getClients = ai.defineFlow(
  {
    name: 'getClients',
    outputSchema: z.array(ClientSchema),
  },
  async () => {
    console.log('[CLIENTS_FLOW] Fetching all clients from database...');
    const results: any[] = await executeQuery('SELECT * FROM clients ORDER BY created_at DESC');
    // The 'plans' column is stored as JSON in the database.
    // We need to parse it before returning.
    return results.map(client => ({
        ...client,
        plans: client.plans ? JSON.parse(client.plans) : []
    })) as Client[];
  }
);

// Flow to add a new client
export const addClientFlow = ai.defineFlow(
  {
    name: 'addClientFlow',
    inputSchema: AddClientInputSchema,
    outputSchema: ClientSchema,
  },
  async (clientData) => {
    console.log('[CLIENTS_FLOW] Adding new client to database...');
    const newClientId = randomUUID();
    const newClient: Client = {
      ...clientData,
      id: newClientId,
      createdAt: new Date(),
    };
    
    await executeQuery(
      'INSERT INTO clients (id, name, tax_id, contact_name, email, phone, whatsapp, notes, status, created_at, plans) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newClient.id, 
        newClient.name, 
        newClient.taxId, 
        newClient.contactName, 
        newClient.email, 
        newClient.phone, 
        newClient.whatsapp, 
        newClient.notes, 
        newClient.status, 
        newClient.createdAt, 
        JSON.stringify(newClient.plans || []) // Store plans array as a JSON string
      ]
    );

    return newClient;
  }
);

export async function addClient(clientData: AddClientInput): Promise<Client> {
    return addClientFlow(clientData);
}


// Flow to update an existing client
export const updateClient = ai.defineFlow(
  {
    name: 'updateClient',
    inputSchema: UpdateClientInputSchema,
    outputSchema: ClientSchema.nullable(),
  },
  async ({ clientId, updates }) => {
    console.log(`[CLIENTS_FLOW] Updating client ${clientId} in database...`);
    
    if (Object.keys(updates).length === 0) {
        const result: any[] = await executeQuery('SELECT * FROM clients WHERE id = ?', [clientId]);
        if (result.length > 0) {
            const client = result[0];
            return { ...client, plans: client.plans ? JSON.parse(client.plans) : [] } as Client;
        }
        return null;
    }
    
    // If plans are being updated, they need to be stringified.
    if (updates.plans) {
        (updates as any).plans = JSON.stringify(updates.plans);
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE clients SET ${setClause} WHERE id = ?`, [...values, clientId]);
    
    const result: any[] = await executeQuery('SELECT * FROM clients WHERE id = ?', [clientId]);
     if (result.length > 0) {
        const client = result[0];
        return { ...client, plans: client.plans ? JSON.parse(client.plans) : [] } as Client;
    }
    return null;
  }
);

// Flow to delete a client
export const deleteClient = ai.defineFlow(
  {
    name: 'deleteClient',
    inputSchema: z.string(), // clientId
    outputSchema: z.void(),
  },
  async (clientId) => {
    console.log(`[CLIENTS_FLOW] Deleting client ${clientId} from database...`);
    // Assuming cascading delete is set up for invoices, otherwise they should be handled here.
    await executeQuery('DELETE FROM clients WHERE id = ?', [clientId]);
    console.log(`Client ${clientId} deleted.`);
  }
);
