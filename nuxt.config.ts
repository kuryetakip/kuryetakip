// Nuxt configuration with Supabase PgBouncer Pooler
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  css: [
    '~/assets/css/main.css'
  ],
  app: {
    head: {
      title: 'KuryeTakip — Kurye & Operasyon Yönetim Sistemi',
      htmlAttrs: {
        class: 'dark',
        lang: 'tr'
      },
      meta: [
        { name: 'description', content: 'Kurye paket, mekan, hakediş ve operasyon yönetim platformu' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap' }
      ],
      script: [
        {
          children: `(function() {
            try {
              var theme = localStorage.getItem('theme_preference') || 'dark';
              var isDark = theme !== 'light';
              if (isDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
              }
            } catch (e) {}
          })()`,
          type: 'text/javascript'
        }
      ]
    }
  }
})