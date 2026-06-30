import crypto from "crypto";

// Secret key for signing. MUST be defined in .env — do not hardcode in production!
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_vercel_kopiku_restorasa";
if (!process.env.JWT_SECRET) {
  console.error("⚠️ PERINGATAN: JWT_SECRET belum di-set di file .env! Menggunakan fallback rahasia.");
}

/**
 * Signs a payload to generate a secure JWT-like token.
 * Uses HS256 algorithm with Node.js crypto Hmac.
 */
export function signToken(payload) {
  try {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const data = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 })).toString("base64url"); // Expires in 24h
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    return `${header}.${data}.${signature}`;
  } catch (error) {
    console.error("Token signing error:", error);
    return null;
  }
}

/**
 * Verifies a token and returns the payload if signature is valid and not expired.
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    const [header, data, signature] = token.split(".");
    if (!header || !data || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn("Token expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}
