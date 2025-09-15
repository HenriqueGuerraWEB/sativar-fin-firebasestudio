
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
import { RowDataPacket } from 'mysql2';

// Input schema for updating a category name
const UpdateCategorySchema = z.object({
  oldName: z.string(),
  newName: z.string(),
});
type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// Input schema for deleting a category
const DeleteCategorySchema = z.string();


const updateCategoryFlow = ai.defineFlow(
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
 * Renames a category for all articles that use it.
 */
export async function updateCategory(input: UpdateCategoryInput): Promise<{ updated: number }> {
    return updateCategoryFlow(input);
}


const deleteCategoryFlow = ai.defineFlow(
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

/**
 * Deletes all articles associated with a specific category.
 */
export async function deleteCategory(categoryName: string): Promise<{ deleted: number }> {
    return deleteCategoryFlow(categoryName);
}
