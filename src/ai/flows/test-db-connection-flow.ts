
'use server';
/**
 * @fileOverview A flow for testing the database connection.
 * 
 * - testDbConnection - A function that handles the database connection test.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { pool } from '@/lib/db';

const TestConnectionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const testDbConnection = ai.defineFlow(
  {
    name: 'testDbConnectionFlow',
    outputSchema: TestConnectionOutputSchema,
  },
  async () => {
    console.log("Attempting to test database connection...");
    if (!pool) {
      return {
        success: false,
        message: "Falha na conexão: O pool de conexões não está inicializado. Verifique as variáveis de ambiente do servidor.",
      };
    }

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.ping(); // Simple and effective way to check if the server is alive
      console.log("Database connection test successful.");
      return {
        success: true,
        message: "Conexão com o banco de dados MySQL bem-sucedida.",
      };
    } catch (error: any) {
      console.error("Database connection test failed:", error);
      return {
        success: false,
        message: `Falha na conexão: ${error.message}`,
      };
    } finally {
      if (connection) {
        connection.release();
        console.log("Database connection for test released.");
      }
    }
  }
);
