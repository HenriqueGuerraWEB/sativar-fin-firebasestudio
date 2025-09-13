'use server';
/**
 * @fileOverview Genkit flows for managing clients.
 * 
 * - getClients - Retrieves all clients.
 * - addClient - Adds a new client.
 * - updateClient - Updates an existing client.
 * - deleteClient - Deletes a client.
 */

import { ai } from '../../ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '../../lib/db';
import { randomUUID } from 'crypto';
import { 
    ClientSchema,
    Client,
    AddClientInputSchema,
    AddClientInput,
    UpdateClientInputSchema 
} from '../../lib/types/client-types';
import { RowDataPacket } from 'mysql2';


// Function to get all clients
export async function getClients() {
  console.log('[CLIENTS_FLOW] Fetching all clients from database...');
  const results = await executeQuery('SELECT * FROM clients ORDER BY created_at DESC') as RowDataPacket[];
  // Map database snake_case to application camelCase
  return results.map(client => ({
      id: client.id,
      name: client.name,
      taxId: client.tax_id,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp,
      notes: client.notes,
      status: client.status,
      createdAt: client.created_at,
      plans: client.plans || [] // mysql2 driver handles JSON parsing
  })) as Client[];
}

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


// Function to update an existing client
export async function updateClient(clientId: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>) {
  console.log(`[CLIENTS_FLOW] Updating client ${clientId} in database...`);
  
  if (Object.keys(updates).length === 0) {
      const result = await executeQuery('SELECT * FROM clients WHERE id = ?', [clientId]) as RowDataPacket[];
      if (result.length > 0) {
          const client = result[0];
          return {
              id: client.id,
              name: client.name,
              taxId: client.tax_id,
              contactName: client.contact_name,
              email: client.email,
              phone: client.phone,
              whatsapp: client.whatsapp,
              notes: client.notes,
              status: client.status,
              createdAt: client.created_at,
              plans: client.plans || []
          } as Client;
      }
      return null;
  }
  
  // Convert camelCase keys from the input to snake_case for the database query
  const dbUpdates: { [key: string]: any } = {};
  for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          (dbUpdates as any)[dbKey] = (updates as any)[key];
      }
  }
  
  // If plans are being updated, they need to be stringified.
  if (dbUpdates.plans) {
     dbUpdates.plans = JSON.stringify(dbUpdates.plans);
  }

  const fields = Object.keys(dbUpdates);
  const values = Object.values(dbUpdates);
  const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

  await executeQuery(`UPDATE clients SET ${setClause} WHERE id = ?`, [...values, clientId]);
  
  const result = await executeQuery('SELECT * FROM clients WHERE id = ?', [clientId]) as RowDataPacket[];
   if (result.length > 0) {
      const client = result[0];
      return { 
          id: client.id,
          name: client.name,
          taxId: client.tax_id,
          contactName: client.contact_name,
          email: client.email,
          phone: client.phone,
          whatsapp: client.whatsapp,
          notes: client.notes,
          status: client.status,
          createdAt: client.created_at,
          plans: client.plans || []
      } as Client;
  }
  return null;
}

// Function to delete a client
export async function deleteClient(clientId: string) {
  console.log(`[CLIENTS_FLOW] Deleting client ${clientId} from database...`);
  // Assuming cascading delete is set up for invoices, otherwise they should be handled here.
  await executeQuery('DELETE FROM clients WHERE id = ?', [clientId]);
  console.log(`Client ${clientId} deleted.`);
}