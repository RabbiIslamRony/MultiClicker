// ================================================================
//  CACHE CLEARER EXTENSION — DEFAULT CONFIGURATION
//  This config is seeded on first install.
//  Credentials are intentionally blank — fill them in Settings.
// ================================================================

const DEFAULT_CONFIG = {
  categories: [
    {
      id: 'cat_1',
      name: 'Directorist',
      color: '#4f46e5',
      sites: [
        {
          id: 'site_1',
          name: 'Main Site',
          login: {
            url: 'https://directorist.com/wp-login.php?loggedout=true&wp_lang=en_US',
            username: '',
            password: '',
          },
          targets: [
            {
              id: 'tgt_1',
              name: 'Gravatar Cache',
              enabled: true,
              url: 'https://directorist.com/wp-admin/network/admin.php?page=wphb-caching&view=gravatar',
              selector: '#wphb-clear-cache',
            },
            {
              id: 'tgt_2',
              name: 'Cloudflare Cache',
              enabled: true,
              url: 'https://directorist.com/wp-admin/network/admin.php?page=wphb-caching&view=integrations',
              selector: '#wphb-react-cloudflare .sui-button',
            },
          ],
        },
      ],
    },
  ],
};
