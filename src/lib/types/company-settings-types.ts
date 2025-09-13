
import { z } from 'zod';

// Zod schema for CompanySettings, ensuring data consistency.
export const CompanySettingsSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  logoDataUrl: z.string().nullable().optional(),
});
export type CompanySettings = z.infer<typeof CompanySettingsSchema>;
