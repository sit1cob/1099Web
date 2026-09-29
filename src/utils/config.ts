export const API_CONFIG = {
  BASE_URL: 'https://1099backend.searskairos.ai',
  TIMEOUT: 30000,
};

export const V2_API_CONFIG = {
  BASE_URL: 'https://1099backend.searskairos.ai',
  TIMEOUT: 30000,
};

export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51ShYBeCXpCx4M7N6tFq6N5jhERv10ejjMWJqI0P1VStr1EtTs8Ekx0jV1XSMVBMB5L9W354sCe9YvaZFt7ZUHcfU00inz6JPdx',
  // ⚠️ TESTING ONLY — loaded from .env, never commit the actual key
  SECRET_KEY: import.meta.env.VITE_STRIPE_SECRET_KEY || '',
};

export const APP_CONFIG = {
  VERSION: '2.0.9',
  PLATFORM: 'web',
  APP_NAME: '1099 FieldForce Web',
};
