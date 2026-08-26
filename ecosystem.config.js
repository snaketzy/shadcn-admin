module.exports = {
  apps: [
    {
      name: 'shadcn-admin-api',
      script: './server.ts',
      interpreter: './node_modules/.bin/tsx',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 3001,
        SERVER_HOST: '127.0.0.1',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      min_uptime: '10s',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
}
