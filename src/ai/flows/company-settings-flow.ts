
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
    };
  }
);

// Helper function to convert empty strings to null
const emptyStringToNull = (value: string | null | undefined): string | null => {
    return value === '' ? null : value || null;
};


// Flow to create or update company settings
export const updateCompanySettings = ai.defineFlow(
  {
    name: 'updateCompanySettings',
    inputSchema: CompanySettingsSchema,
    outputSchema: CompanySettingsSchema,
  },
  async (settings) => {
    console.log('[SETTINGS_FLOW] Updating company settings in database...');
    
    // Sanitize input: convert empty strings to null for optional fields
    const sanitizedSettings = {
        ...settings,
        name: emptyStringToNull(settings.name),
        cpf: emptyStringToNull(settings.cpf),
        cnpj: emptyStringToNull(settings.cnpj),
        address: emptyStringToNull(settings.address),
        phone: emptyStringToNull(settings.phone),
        email: emptyStringToNull(settings.email),
        website: emptyStringToNull(settings.website),
        logoDataUrl: emptyStringToNull(settings.logoDataUrl),
    };


    // The logo is a large data URI, so we use the 'logo' column which should be LONGTEXT
    await executeQuery(
      `INSERT INTO company_settings (id, name, cpf, cnpj, address, phone, email, website, logo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       name=VALUES(name), cpf=VALUES(cpf), cnpj=VALUES(cnpj), address=VALUES(address), 
       phone=VALUES(phone), email=VALUES(email), website=VALUES(website), logo=VALUES(logo)`,
      [
        sanitizedSettings.id || 'single-settings',
        sanitizedSettings.name,
        sanitizedSettings.cpf,
        sanitizedSettings.cnpj,
        sanitizedSettings.address,
        sanitizedSettings.phone,
        sanitizedSettings.email,
        sanitizedSettings.website,
        sanitizedSettings.logoDataUrl
      ]
    );

    return sanitizedSettings;
  }
);

    