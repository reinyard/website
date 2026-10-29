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
      titleDelimiter: '·',
      favicon: '/icon.svg',
      // the same browser-chrome colors as the rest of the site, so the address bar does not change color inside the docs
      head: [
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#f0f4f7', media: '(prefers-color-scheme: light)' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#282f34', media: '(prefers-color-scheme: dark)' } },
      ],
      customCss: ['./src/styles/starlight.css'],
      // Code blocks: the two themes are chosen for their backgrounds, which sit close to the site's page and panel colors, and
      // their syntax colors stay legible against them (Expressive Code checks contrast against the theme's own background).
      expressiveCode: {
        themes: ['github-light', 'github-dark-dimmed'],
        styleOverrides: { borderRadius: '12px', codeFontFamily: 'var(--mono)', uiFontFamily: 'var(--sans)', codeFontSize: '0.86rem' },
      },
      components: {
        Head: './src/components/DocsHead.astro',
        Header: './src/components/DocsHeader.astro',
        Sidebar: './src/components/DocsSidebar.astro',
        PageTitle: './src/components/DocsPageTitle.astro',
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
        // TEMPORARY: the style-test pages. Remove this group and src/content/docs/docs/style-test/ before any PR.
        {
          label: 'Style test',
          collapsed: true,
          items: [
            'docs/style-test',
            'docs/style-test/components',
            'docs/style-test/code',
            'docs/style-test/structure',
            'docs/style-test/splash',
            { label: 'A nested group', collapsed: false, items: ['docs/style-test/nested/page', { label: 'An external link', link: 'https://github.com/reinyard', attrs: { target: '_blank' } }] },
            { label: 'A link with a badge', link: '/docs/', badge: { text: 'New', variant: 'success' } },
          ],
        },
      ],
    }),
  ],
});
