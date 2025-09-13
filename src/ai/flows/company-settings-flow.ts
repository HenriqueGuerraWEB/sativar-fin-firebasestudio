
'use server';
/**
 * @fileOverview Genkit flows for managing company settings.
 * 
 * - getCompanySettings - Retrieves the company settings.
 * - updateCompanySettings - Creates or updates the company settings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { CompanySettingsSchema, CompanySettings } from '@/lib/types/company-settings-types';

// Flow to get company settings
export const getCompanySettings = ai.defineFlow(
  {
    name: 'getCompanySettings',
    outputSchema: CompanySettingsSchema.nullable(),
  },
  async () => {
    console.log('[SETTINGS_FLOW] Fetching company settings from database...');
    const results = await executeQuery('SELECT * FROM company_settings WHERE id = ?', ['single-settings']) as RowDataPacket[];
    if (results.length === 0) {
        return null;
    }
    const settings = results[0];
    // Map database snake_case to application camelCase
    return {
        id: settings.id,
        name: settings.name,
        cpf: settings.cpf,
        cnpj: settings.cnpj,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        logoDataUrl: settings.logo,
    } as CompanySettings;
  }
);

// Flow to create or update company settings
export const updateCompanySettings = ai.defineFlow(
  {
    name: 'updateCompanySettings',
    inputSchema: CompanySettingsSchema,
    outputSchema: CompanySettingsSchema,
  },
  async (settings) => {
    console.log('[SETTINGS_FLOW] Updating company settings in database...');
    
    // The logo is a large data URI, so we use the 'logo' column which should be LONGTEXT
    await executeQuery(
      `INSERT INTO company_settings (id, name, cpf, cnpj, address, phone, email, website, logo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       name=VALUES(name), cpf=VALUES(cpf), cnpj=VALUES(cnpj), address=VALUES(address), 
       phone=VALUES(phone), email=VALUES(email), website=VALUES(website), logo=VALUES(logo)`,
      [
        settings.id || 'single-settings',
        settings.name,
        settings.cpf,
        settings.cnpj,
        settings.address,
        settings.phone,
        settings.email,
        settings.website,
        settings.logoDataUrl
      ]
    );

    return settings;
  }
);
