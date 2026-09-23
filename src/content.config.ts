import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projets = defineCollection({
  loader: glob({
    base: './src/content/projets',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, ''),
  }),
  schema: z.object({
    title: z.string().trim().min(1),
    type: z.string().trim().min(1).default('Projet'),
    description: z.string().trim().min(1).default('Description à venir.'),
    skills: z.array(z.string().trim().min(1)).default([]),
    order: z.number().int().nonnegative(),
    featured: z.boolean().default(false),
    featuredOrder: z.number().int().nonnegative().optional(),
    projectUrl: z.union([
      z.string().trim().url(),
      z.string().trim().regex(/^\/(?!\/)/, 'Le chemin doit commencer par un seul « / ».')
    ]).optional(),
  }),
});

export const collections = { projets };
