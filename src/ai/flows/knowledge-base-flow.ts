'use server';
/**
 * @fileOverview Genkit flows for managing knowledge base articles.
 * 
 * - getArticles - Retrieves all articles (metadata only).
 * - getArticle - Retrieves a single article by ID, including content.
 * - createArticle - Adds a new, empty article.
 * - updateArticle - Updates an existing article.
 * - deleteArticle - Deletes an article.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { RowDataPacket } from 'mysql2';
import { 
    KnowledgeBaseArticleSchema, 
    KnowledgeBaseArticle,
    CreateArticleInputSchema,
    UpdateArticleInputSchema,
    ArticleListItemSchema
} from '@/lib/types/knowledge-base-types';


// Flow to get all articles (metadata only for list view)
export const getArticles = ai.defineFlow(
  {
    name: 'getArticles',
    outputSchema: z.array(ArticleListItemSchema),
  },
  async () => {
    console.log('[KB_FLOW] Fetching all articles from database...');
    // Select all columns to be resilient to schema changes
    const results = await executeQuery(
        'SELECT * FROM knowledge_base_articles ORDER BY updatedAt DESC'
    ) as RowDataPacket[];

    return results.map(article => ({
        id: article.id,
        title: article.title,
        category: article.category,
        icon: article.icon,
        // Ensure metadata is always an array, even if DB returns null, string, or object
        metadata: Array.isArray(article.metadata) 
            ? article.metadata 
            : (article.metadata && typeof article.metadata === 'string' ? JSON.parse(article.metadata) : []),
        authorId: article.authorId,
        createdAt: article.createdAt ? new Date(article.createdAt).toISOString() : '',
        updatedAt: article.updatedAt ? new Date(article.updatedAt).toISOString() : '',
    }));
  }
);


// Flow to get a single full article
export const getArticle = ai.defineFlow(
  {
    name: 'getArticle',
    inputSchema: z.string(), // articleId
    outputSchema: KnowledgeBaseArticleSchema.nullable(),
  },
  async (articleId) => {
    console.log(`[KB_FLOW] Fetching article ${articleId} from database...`);
    const results = await executeQuery('SELECT * FROM knowledge_base_articles WHERE id = ?', [articleId]) as RowDataPacket[];
    
    if (results.length === 0) {
      return null;
    }
    const article = results[0];
    return {
        id: article.id,
        title: article.title,
        category: article.category,
        icon: article.icon,
        content: article.content, // mysql2 driver handles JSON parsing
        // Ensure metadata is always an array
        metadata: Array.isArray(article.metadata) 
            ? article.metadata 
            : (article.metadata && typeof article.metadata === 'string' ? JSON.parse(article.metadata) : []),
        authorId: article.authorId,
        createdAt: new Date(article.createdAt).toISOString(),
        updatedAt: new Date(article.updatedAt).toISOString(),
    };
  }
);


// Flow to create a new article
export const createArticle = ai.defineFlow(
  {
    name: 'createArticle',
    inputSchema: CreateArticleInputSchema,
    outputSchema: KnowledgeBaseArticleSchema,
  },
  async (articleData) => {
    console.log('[KB_FLOW] Adding new article to database...');
    const now = new Date();
    const newArticle: KnowledgeBaseArticle = {
      id: randomUUID(),
      title: articleData.title || "Artigo sem Título",
      category: articleData.category || "Rascunhos",
      icon: articleData.icon || null,
      content: articleData.content || {},
      // Ensure metadata is created as an array
      metadata: articleData.metadata || [],
      authorId: articleData.authorId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    const formattedNow = format(now, 'yyyy-MM-dd HH:mm:ss');
    await executeQuery(
      'INSERT INTO knowledge_base_articles (id, title, category, icon, content, metadata, authorId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newArticle.id, 
        newArticle.title,
        newArticle.category, 
        newArticle.icon,
        JSON.stringify(newArticle.content), 
        // Always stringify an array for metadata
        JSON.stringify(newArticle.metadata),
        newArticle.authorId,
        formattedNow,
        formattedNow
      ]
    );

    return newArticle;
  }
);

// Flow to update an existing article
export const updateArticle = ai.defineFlow(
  {
    name: 'updateArticle',
    inputSchema: z.object({
        articleId: z.string(),
        updates: UpdateArticleInputSchema
    }),
    outputSchema: KnowledgeBaseArticleSchema.nullable(),
  },
  async ({ articleId, updates }) => {
    console.log(`[KB_FLOW] Updating article ${articleId} in database...`);
    
    // Add updatedAt timestamp to the updates
    const updatesWithTimestamp: Record<string, any> = {
        ...updates,
        updatedAt: new Date(), // Use Date object, format later
    };

    const dbUpdates: { [key: string]: any } = {};
    for (const key in updatesWithTimestamp) {
      if (Object.prototype.hasOwnProperty.call(updatesWithTimestamp, key)) {
          const dbKey = key;
          if (key === 'content' || key === 'metadata') {
             dbUpdates[dbKey] = JSON.stringify(updatesWithTimestamp[key] || []); // Default to empty array for JSON fields
          } else if (key === 'createdAt' || key === 'updatedAt') {
             // Format date fields for MySQL
             dbUpdates[dbKey] = format(new Date(updatesWithTimestamp[key]), 'yyyy-MM-dd HH:mm:ss');
          } else {
              dbUpdates[dbKey] = updatesWithTimestamp[key];
          }
      }
    }
    
    const fields = Object.keys(dbUpdates);
    const values = Object.values(dbUpdates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE knowledge_base_articles SET ${setClause} WHERE id = ?`, [...values, articleId]);
    
    // Fetch the updated article to return it
    const result = await getArticle(articleId);
    return result;
  }
);

// Flow to delete an article
export const deleteArticle = ai.defineFlow(
  {
    name: 'deleteArticle',
    inputSchema: z.string(), // articleId
    outputSchema: z.void(),
  },
  async (articleId) => {
    console.log(`[KB_FLOW] Deleting article ${articleId} from database...`);
    await executeQuery('DELETE FROM knowledge_base_articles WHERE id = ?', [articleId]);
    console.log(`Article ${articleId} deleted.`);
  }
);
