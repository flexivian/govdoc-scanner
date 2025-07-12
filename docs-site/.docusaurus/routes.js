import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/govdoc-scanner/blog',
    component: ComponentCreator('/govdoc-scanner/blog', '0f0'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/archive',
    component: ComponentCreator('/govdoc-scanner/blog/archive', '719'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/authors',
    component: ComponentCreator('/govdoc-scanner/blog/authors', 'c49'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/authors/all-sebastien-lorber-articles',
    component: ComponentCreator('/govdoc-scanner/blog/authors/all-sebastien-lorber-articles', '8ae'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/authors/yangshun',
    component: ComponentCreator('/govdoc-scanner/blog/authors/yangshun', '858'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/first-blog-post',
    component: ComponentCreator('/govdoc-scanner/blog/first-blog-post', '166'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/long-blog-post',
    component: ComponentCreator('/govdoc-scanner/blog/long-blog-post', '131'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/mdx-blog-post',
    component: ComponentCreator('/govdoc-scanner/blog/mdx-blog-post', 'c8f'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/tags',
    component: ComponentCreator('/govdoc-scanner/blog/tags', 'de8'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/tags/docusaurus',
    component: ComponentCreator('/govdoc-scanner/blog/tags/docusaurus', 'eb1'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/tags/facebook',
    component: ComponentCreator('/govdoc-scanner/blog/tags/facebook', 'b7e'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/tags/hello',
    component: ComponentCreator('/govdoc-scanner/blog/tags/hello', '8d6'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/tags/hola',
    component: ComponentCreator('/govdoc-scanner/blog/tags/hola', 'a6a'),
    exact: true
  },
  {
    path: '/govdoc-scanner/blog/welcome',
    component: ComponentCreator('/govdoc-scanner/blog/welcome', '446'),
    exact: true
  },
  {
    path: '/govdoc-scanner/markdown-page',
    component: ComponentCreator('/govdoc-scanner/markdown-page', 'fe3'),
    exact: true
  },
  {
    path: '/govdoc-scanner/docs',
    component: ComponentCreator('/govdoc-scanner/docs', '175'),
    routes: [
      {
        path: '/govdoc-scanner/docs',
        component: ComponentCreator('/govdoc-scanner/docs', '924'),
        routes: [
          {
            path: '/govdoc-scanner/docs',
            component: ComponentCreator('/govdoc-scanner/docs', '5f8'),
            routes: [
              {
                path: '/govdoc-scanner/docs/code-examples/overview',
                component: ComponentCreator('/govdoc-scanner/docs/code-examples/overview', 'ad9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/govdoc-scanner/docs/gsoc/2025/overview',
                component: ComponentCreator('/govdoc-scanner/docs/gsoc/2025/overview', '1ee'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/govdoc-scanner/docs/installation/Development',
                component: ComponentCreator('/govdoc-scanner/docs/installation/Development', 'ba4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/govdoc-scanner/docs/installation/Getting Started',
                component: ComponentCreator('/govdoc-scanner/docs/installation/Getting Started', '6b9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/govdoc-scanner/docs/installation/Production',
                component: ComponentCreator('/govdoc-scanner/docs/installation/Production', '4e1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/govdoc-scanner/docs/intro',
                component: ComponentCreator('/govdoc-scanner/docs/intro', 'f5c'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/govdoc-scanner/',
    component: ComponentCreator('/govdoc-scanner/', '1ef'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
