
'use server';
/**
 * @fileOverview Genkit flows for managing the Knowledge Base.
 * 
 * - getArticles - Retrieves all articles.
 * - getArticleById - Retrieves a single article by its ID.
 * - addArticle - Adds a new article.
 * - updateArticle - Updates an existing article.
 * - deleteArticle - Deletes an article.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import {
    KnowledgeBaseArticleSchema,
    KnowledgeBaseArticle,
    AddArticleInputSchema,
    UpdateArticleInputSchema
} from '@/lib/types/knowledge-base-types';
import { RowDataPacket } from 'mysql2';

// Helper function to format dates for MySQL
const formatDateForMySQL = (date: Date): string => {
    return format(date, 'yyyy-MM-dd HH:mm:ss');
};

// Flow to get all articles (metadata only, for performance)
export const getArticles = ai.defineFlow(
  {
    name: 'getArticles',
    outputSchema: z.array(KnowledgeBaseArticleSchema.omit({ content: true })),
  },
  async () => {
    console.log('[KB_FLOW] Fetching all articles from database...');
    const results = await executeQuery('SELECT id, title, metadata, authorId, createdAt, updatedAt FROM knowledge_base_articles ORDER BY updatedAt DESC') as RowDataPacket[];
    return results.map(article => ({
      id: article.id,
      title: article.title,
      metadata: article.metadata || {}, // mysql2 driver handles JSON parsing
      authorId: article.authorId,
      createdAt: new Date(article.createdAt).toISOString(),
      updatedAt: new Date(article.updatedAt).toISOString(),
    }));
  }
);

// Flow to get a single article by ID (including content)
export const getArticleById = ai.defineFlow(
  {
    name: 'getArticleById',
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
      content: article.content || [], // mysql2 driver handles JSON parsing
      metadata: article.metadata || {},
      authorId: article.authorId,
      createdAt: new Date(article.createdAt).toISOString(),
      updatedAt: new Date(article.updatedAt).toISOString(),
    };
  }
);

// Flow to add a new article
export const addArticle = ai.defineFlow(
  {
    name: 'addArticle',
    inputSchema: AddArticleInputSchema,
    outputSchema: KnowledgeBaseArticleSchema,
  },
  async (articleData) => {
    console.log('[KB_FLOW] Adding new article to database...');
    const now = new Date();
    const newArticle: KnowledgeBaseArticle = {
      ...articleData,
      id: randomUUID(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    await executeQuery(
      'INSERT INTO knowledge_base_articles (id, title, content, metadata, authorId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        newArticle.id,
        newArticle.title,
        JSON.stringify(newArticle.content || []),
        JSON.stringify(newArticle.metadata || {}),
        newArticle.authorId,
        formatDateForMySQL(now),
        formatDateForMySQL(now),
      ]
    );

    return newArticle;
  }
);

// Flow to update an existing article
export const updateArticle = ai.defineFlow(
  {
    name: 'updateArticle',
    inputSchema: UpdateArticleInputSchema,
    outputSchema: KnowledgeBaseArticleSchema.nullable(),
  },
  async ({ articleId, updates }) => {
    console.log(`[KB_FLOW] Updating article ${articleId} in database...`);
    
    if (Object.keys(updates).length === 0) {
        return getArticleById(articleId);
    }
    
    // Add updatedAt timestamp
    const updatePayload = { ...updates, updatedAt: new Date().toISOString() };

    // Convert camelCase keys to snake_case for the DB query if needed, but here we assume they match
    // For JSON fields, we must stringify them
    const dbUpdates: { [key: string]: any } = {};
    for (const key in updatePayload) {
        if (Object.prototype.hasOwnProperty.call(updatePayload, key)) {
            const value = (updatePayload as any)[key];
            if (key === 'content' || key === 'metadata') {
                dbUpdates[key] = JSON.stringify(value || (key === 'content' ? [] : {}));
            } else if (key === 'updatedAt') {
                 dbUpdates[key] = formatDateForMySQL(new Date(value));
            } else {
                 dbUpdates[key] = value;
            }
        }
    }
    
    const fields = Object.keys(dbUpdates);
    const values = Object.values(dbUpdates);
    const setClause = fields.map(field => `\`${field.replace(/`/g, '``')}\` = ?`).join(', ');

    await executeQuery(`UPDATE knowledge_base_articles SET ${setClause} WHERE id = ?`, [...values, articleId]);
    
    return getArticleById(articleId);
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
