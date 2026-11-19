// Scripted HTML previews run in sandboxed frames. Monaco's AMD loader uses eval.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
  "style-src 'self' 'unsafe-inline' data:",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self' about: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

function internalURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'toolbox:' && url.host === 'app' && !url.username && !url.password;
  } catch { return false; }
}

function externalURL(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

module.exports = {contentSecurityPolicy, internalURL, externalURL};
