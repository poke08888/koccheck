// PM2 process file for bare-metal / VPS deploys.
//   cd server && npm ci && npm run seed   (first time)
//   pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'livescope',
      script: 'src/server.js',
      node_args: '--no-warnings',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
        // DATABASE_URL: 'postgres://user:pass@localhost:5432/koc',  // omit for SQLite
        // AUTH_SECRET: 'change-me',
        // ADMIN_PASSWORD: 'set-a-strong-password'
      }
    }
  ]
};
