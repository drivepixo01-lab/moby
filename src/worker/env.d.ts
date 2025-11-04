// Extend the Cloudflare Env interface with our custom bindings
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    MOCHA_USERS_SERVICE_API_URL: string;
    MOCHA_USERS_SERVICE_API_KEY: string;
    ASSEMBLYAI_API_KEY: string;
    OPENAI_API_KEY?: string;
    DEEPGRAM_API_KEY?: string;
    ELEVENLABS_API_KEY?: string;
  }
}
