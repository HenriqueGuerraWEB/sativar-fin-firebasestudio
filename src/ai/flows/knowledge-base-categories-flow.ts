
'use server';
/**
 * @fileOverview Genkit flows for managing knowledge base article categories.
 *
 * - updateCategory: Renames a category across all relevant articles.
 * - deleteCategory: Deletes all articles belonging to a specific category.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';

// Input schema for updating a category name
export const UpdateCategorySchema = z.object({
  oldName: z.string(),
  newName: z.string(),
});

// Input schema for deleting a category
export const DeleteCategorySchema = z.string();


/**
 * Renames a category for all articles that use it.
 */
export const updateCategory = ai.defineFlow(
  {
    name: 'updateKnowledgeBaseCategory',
    inputSchema: UpdateCategorySchema,
    outputSchema: z.object({ updated: z.number() }),
  },
  async ({ oldName, newName }) => {
    console.log(`[KB_CAT_FLOW] Renaming category from "${oldName}" to "${newName}"...`);
    
    if (!newName.trim()) {
        throw new Error("New category name cannot be empty.");
    }
    
    const result: any = await executeQuery(
      'UPDATE knowledge_base_articles SET category = ? WHERE category = ?',
      [newName, oldName]
    );

    console.log(`Updated ${result.affectedRows} articles.`);
    return { updated: result.affectedRows };
  }
);

/**
 * Deletes all articles associated with a specific category.
 */
export const deleteCategory = ai.defineFlow(
  {
    name: 'deleteKnowledgeBaseCategory',
    inputSchema: DeleteCategorySchema,
    outputSchema: z.object({ deleted: z.number() }),
  },
  async (categoryName) => {
    console.log(`[KB_CAT_FLOW] Deleting category "${categoryName}" and all its articles...`);

    const result: any = await executeQuery(
      'DELETE FROM knowledge_base_articles WHERE category = ?',
      [categoryName]
    );
    
    console.log(`Deleted ${result.affectedRows} articles.`);
    return { deleted: result.affectedRows };
  }
);
