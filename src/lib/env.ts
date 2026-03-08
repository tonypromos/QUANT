const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const normalizeEnvString = (value?: string): string => {
  if (!value) {
    return '';
  }

  // Normalize accidental smart quotes pasted from password managers/docs.
  const trimmed = value.trim();
  const dequoted = trimmed
    .replace(/^["'“”‘’]/, '')
    .replace(/["'“”‘’]$/, '');

  return dequoted;
};

export const env = {
  databaseUrl: required('DATABASE_URL', 'postgresql://localhost:5432/quant'),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? '24'),
  sessionCookieName: normalizeEnvString(process.env.SESSION_COOKIE_NAME) || 'quant_session',
  operatorUsername: normalizeEnvString(required('OPERATOR_USERNAME', 'operator')),
  operatorPassword: normalizeEnvString(required('OPERATOR_PASSWORD', 'change_me_operator')),
  analystUsername: normalizeEnvString(required('ANALYST_USERNAME', 'analyst')),
  analystPassword: normalizeEnvString(required('ANALYST_PASSWORD', 'change_me_analyst')),
  killSwitchSharedSecret: normalizeEnvString(required('KILL_SWITCH_SHARED_SECRET', 'change_me_kill_secret')),
  liveWalletKeyRef: normalizeEnvString(process.env.LIVE_WALLET_KEY_REF),
  appBaseUrl: normalizeEnvString(process.env.APP_BASE_URL) || 'http://localhost:3000',
  emailFrom: normalizeEnvString(process.env.EMAIL_FROM) || 'alerts@example.com',
  emailApiKey: normalizeEnvString(process.env.EMAIL_API_KEY),
  polymarketFeedMode: normalizeEnvString(process.env.POLYMARKET_FEED_MODE) || 'mock',
  polymarketClobBaseUrl: normalizeEnvString(process.env.POLYMARKET_CLOB_BASE_URL) || 'https://clob.polymarket.com',
  polymarketGammaBaseUrl: normalizeEnvString(process.env.POLYMARKET_GAMMA_BASE_URL) || 'https://gamma-api.polymarket.com',
  polymarketApiKey: normalizeEnvString(process.env.POLYMARKET_API_KEY),
  polymarketApiSecret: normalizeEnvString(process.env.POLYMARKET_API_SECRET),
  polymarketApiPassphrase: normalizeEnvString(process.env.POLYMARKET_API_PASSPHRASE),
  polymarketProfileKey: normalizeEnvString(process.env.POLYMARKET_PROFILE_KEY)
};
