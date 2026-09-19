import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Blog articles, carried over from the previous jimdandysewerandplumbing.com
 * (the client's own content) at their original URLs so existing search
 * rankings and links keep working.
 */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.string(),
    /** Service page this article supports - linked at the end of the post. */
    service: z.enum(["emergency", "drains-clogs", "sewer-services", "water-heaters", "all-plumbing", "commercial"]),
  }),
});

export const collections = { blog };
