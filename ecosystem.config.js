module.exports = {
  apps: [
    {
      name: 'shadcn-admin-api',
      script: './server.ts',
      interpreter: './node_modules/.bin/tsx',
      interpreter_args: '',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      restart_delay: 3000,
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
}
