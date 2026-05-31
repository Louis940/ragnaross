import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const sections = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/sections" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    groupBy: z.enum(["year", "location", "none"]).default("none"),
    yearIntros: z.record(z.string(), z.string()).optional(),
    locationIntros: z.record(z.string(), z.string()).optional(),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    section: z.string(),
    description: z.string().optional(),
    year: z.number().optional(),
    location: z.string().optional(),
    rating: z.number().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { sections, articles };
