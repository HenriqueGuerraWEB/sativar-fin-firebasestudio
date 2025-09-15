import { z } from 'zod';

export const ArticleMetadataSchema = z.object({
    key: z.string(),
    value: z.string(),
});
export type ArticleMetadata = z.infer<typeof ArticleMetadataSchema>;

export const KnowledgeBaseArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  content: z.any().optional(), // Stores TipTap JSON content
  metadata: z.array(ArticleMetadataSchema).optional(),
  authorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KnowledgeBaseArticle = z.infer<typeof KnowledgeBaseArticleSchema>;


// A lighter version for list views
export const ArticleListItemSchema = KnowledgeBaseArticleSchema.pick({
    id: true,
    title: true,
    category: true,
    icon: true,
    authorId: true,
    createdAt: true,
    updatedAt: true,
    metadata: true,
});
export type ArticleListItem = z.infer<typeof ArticleListItemSchema>;


export const CreateArticleInputSchema = z.object({
    title: z.string().optional(),
    category: z.string().optional(),
    icon: z.string().nullable().optional(),
    content: z.any().optional(),
    metadata: z.array(ArticleMetadataSchema).optional(),
    authorId: z.string(),
});
export type CreateArticleInput = z.infer<typeof CreateArticleInputSchema>;


export const UpdateArticleInputSchema = KnowledgeBaseArticleSchema.omit({
    id: true,
    authorId: true,
    createdAt: true,
    updatedAt: true,
}).partial();
export type UpdateArticleInput = z.infer<typeof UpdateArticleInputSchema>;
