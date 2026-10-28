import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://reinyard.com',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  integrations: [
    starlight({
      title: 'Reinyard',
      description: 'Documentation for Reinyard: build, version and run agents in isolated sandboxes.',
      favicon: '/icon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
      ],
      customCss: ['./src/styles/fonts.css', './src/styles/starlight.css'],
      components: {
        Header: './src/components/DocsHeader.astro',
        Footer: './src/components/DocsFooter.astro',
        ThemeSelect: './src/components/ThemeSwitch.astro',
        SocialIcons: './src/components/DocsSocial.astro',
      },
      disable404Route: true,
      lastUpdated: false,
      pagination: true,
      sidebar: [
        { label: 'Start here', items: ['docs', 'docs/concepts'] },
        {
          label: 'Concepts',
          items: [
            'docs/concepts/pipelines',
            'docs/concepts/sandboxes',
            'docs/concepts/runs',
            'docs/concepts/access',
            'docs/concepts/workspaces',
          ],
        },
        { label: 'Operate', items: ['docs/self-hosting', 'docs/security', 'docs/cloud'] },
      ],
    }),
  ],
});
