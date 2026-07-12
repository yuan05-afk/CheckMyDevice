const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.startsWith('pnpm/')) {
  console.error('This project uses pnpm. Run `corepack enable`, then use pnpm.');
  process.exit(1);
}
