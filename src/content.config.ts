import { defineCollection } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // Starlight's UI strings; declared so the build has no missing-collection warning (the site is English only).
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
