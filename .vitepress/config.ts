import { defineConfig } from 'vitepress'
import { getPosts } from './theme/serverUtils'

//每页的文章数量
const pageSize = 10

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
    title: 'sweetbrulee',
    base: '/',
    cacheDir: './node_modules/vitepress_cache',
    description: 'sweetbrulee 的个人技术博客，讨论并分享计算机技术。',
    ignoreDeadLinks: true,
    themeConfig: {
        posts: await getPosts(pageSize),
        website: 'https://github.com/airene/vitepress-blog-pure', //copyright link
        // 评论的仓库地址 https://giscus.app/ 请按照这个官方初始化后覆盖
        comment: {
            repo: 'sweetbrulee/sweetbrulee.github.io',
            repoId: 'R_kgDOIYuLPw',
            categoryId: 'DIC_kwDOIYuLP84Cvklv'
        },
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Category', link: '/pages/category' },
            { text: 'Archives', link: '/pages/archives' },
            { text: 'Tags', link: '/pages/tags' },
            { text: 'About', link: '/pages/about' }
            // { text: 'Airene', link: 'http://airene.net' }  -- External link test
        ],
        search: {
            provider: 'local'
        },
        //outline:[2,3],
        outline: {
            label: '文章摘要'
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/sweetbrulee/' },
            { icon: 'linkedin', link: 'https://www.linkedin.com/in/shaocheng-ruan/' }
        ]
    } as any,

    srcExclude: isProd
        ? [
              '**/trash/**/*.md', // 排除所有 trash 目录
              '**/draft/**/*.md', // 递归排除子目录
              '**/private-notes/*.md', // 排除特定文件
              'README.md'
          ]
        : ['README.md'],
    vite: {
        //build: { minify: false }
    },
    markdown: {
        math: true
    },
    sitemap: {
        hostname: 'https://sweetbrulee.github.io',
        lastmodDateOnly: false
    },
    lastUpdated: true
    /*
      optimizeDeps: {
          keepNames: true
      }
      */
})
