// Loads .env before any spec, for the same reason `nest start` does: modules
// like auth/utils/jwt.util.ts read process.env at import time and throw when
// JWT_SECRET is missing. A set value always wins, here and in CI.
import 'dotenv/config';
