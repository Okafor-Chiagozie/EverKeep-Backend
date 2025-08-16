import { z } from 'zod';

export const getVaultsQueryDto = z.object({
  query: z.object({
    pageSize: z.string().transform(Number).default('10').optional(),
    pageNumber: z.string().transform(Number).default('1').optional(),
    user_id: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const createVaultDto = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
});

export const updateVaultDto = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
});

export const createVaultEntryDto = z.object({
  body: z.object({
    type: z.string().min(1),
    content: z.string().min(1),
    parent_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(), // MongoDB ObjectId format
  }),
});

export const updateVaultEntryDto = z.object({
  body: z.object({
    content: z.string().min(1),
  }),
});

export const addVaultRecipientDto = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vault ID'),
  }),
  body: z.object({
    contact_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact ID'),
  }),
});

export const verifyShareDto = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
}); 