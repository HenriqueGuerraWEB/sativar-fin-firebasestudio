
'use server';
/**
 * @fileOverview Genkit flows for managing user authentication.
 * 
 * - getUser: Retrieves a user by email and password.
 * - adminExists: Checks if an admin user exists.
 * - createAdmin: Creates the first admin user.
 * - updateAdmin: Updates an admin user's details.
 */

import { ai, getAuth } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { UserSchema, User, CreateUserInputSchema, UpdateUserInputSchema } from '@/lib/types/user-types';


export const getUser = ai.defineFlow(
  {
    name: 'getUser',
    inputSchema: z.object({ email: z.string().email(), password: z.string() }),
    outputSchema: UserSchema.omit({ password: true }).nullable(),
  },
  async ({ email, password }) => {
    console.log(`[USERS_FLOW] Attempting to get user by email: ${email}`);
    // IMPORTANT: In a real app, passwords should be hashed and salted.
    // Storing and comparing plain text passwords is a major security risk.
    const results = await executeQuery(
      'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
      [email, password] 
    ) as RowDataPacket[];

    if (results.length > 0) {
      console.log(`[USERS_FLOW] User found: ${email}`);
      return results[0] as Omit<User, 'password'>;
    }
    
    console.log(`[USERS_FLOW] User not found: ${email}`);
    return null;
  }
);


export const adminExists = ai.defineFlow(
  {
    name: 'adminExists',
    outputSchema: z.boolean(),
  },
  async () => {
    console.log('[USERS_FLOW] Checking if admin exists...');
    const results = await executeQuery('SELECT COUNT(*) as count FROM users') as RowDataPacket[];
    const exists = results[0].count > 0;
    console.log(`[USERS_FLOW] Admin exists: ${exists}`);
    return exists;
  }
);


export const createAdmin = ai.defineFlow(
  {
    name: 'createAdmin',
    inputSchema: CreateUserInputSchema,
    outputSchema: UserSchema.omit({ password: true }),
  },
  async (userData) => {
    console.log('[USERS_FLOW] Creating new admin user...');
    
    const countResult = await executeQuery('SELECT COUNT(*) as count FROM users') as RowDataPacket[];
    if (countResult[0].count > 0) {
      throw new Error('An admin account already exists.');
    }
    
    const newAdmin: User = {
      ...userData,
      id: randomUUID(),
    };
    
    // IMPORTANT: In a real app, passwords should be hashed and salted.
    await executeQuery(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [newAdmin.id, newAdmin.name, newAdmin.email, newAdmin.password]
    );
    console.log(`[USERS_FLOW] Admin user created: ${newAdmin.email}`);

    const { password, ...adminData } = newAdmin;
    return adminData;
  }
);


export const updateAdmin = ai.defineFlow(
  {
    name: 'updateAdmin',
    inputSchema: UpdateUserInputSchema.omit({ userId: true }), // userId will come from auth context
    outputSchema: UserSchema.omit({ password: true }).nullable(),
    authPolicy: (auth, input) => {
        if (!auth) throw new Error("User not authenticated.");
    }
  },
  async (updates) => {
    const auth = getAuth();
    if (!auth) throw new Error("User not authenticated.");
    
    const userId = auth.id;
    console.log(`[USERS_FLOW] Updating admin user ${userId}...`);
    
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      const current = await executeQuery('SELECT id, name, email FROM users WHERE id = ?', [userId]) as RowDataPacket[];
      return current.length > 0 ? current[0] as User : null;
    }
    
    const values = Object.values(updates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, userId]);
    
    const result = await executeQuery('SELECT id, name, email FROM users WHERE id = ?', [userId]) as RowDataPacket[];
    if (result.length > 0) {
      console.log(`[USERS_FLOW] Admin user ${userId} updated.`);
      return result[0] as User;
    }
    return null;
  }
);
