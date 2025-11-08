import {z} from 'zod';

// Create comment schema
export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters')
    .trim(),
  parentId: z.string().optional() // For reply comments
});

// Update comment schema
export const updateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters')
    .trim()
});

// Query parameters schema for GET /comments
export const getCommentsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  sortBy: z.enum(['newest', 'oldest', 'likes', 'dislikes']).optional().default('newest')
});

// Comment ID parameter schema
export const commentIdSchema = z.object({
  id: z.string().min(1, 'Comment ID is required')
});

// Like/Dislike action schema
export const likeActionSchema = z.object({
  action: z.enum(['like', 'dislike', 'remove'], 'Action must be like, dislike, or remove')
});

// Like comment parameter schema (for route params)
export const likeCommentParamsSchema = z.object({
  id: z.string().min(1, 'Comment ID is required')
});