import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jve.admin',
  appName: '杰弘业务管理系统',
  webDir: 'dist',
  server: {
    url: 'https://jh.jvecloud.com',
    allowNavigation: ['jh.jvecloud.com'],
  },
}

export default config
