/**
 * QR Token Utility
 *
 * Token strategy:
 *  1. generateQRToken()  → produces a cryptographically random 64-char hex string
 *  2. hashToken()        → SHA-256 of that token → stored in DB (never the raw token)
 *  3. generateQRImage()  → encodes the raw token into a PNG QR code
 *
 * On scan: raw token arrives → hashToken() → lookup in DB → found = valid participant
 */

import crypto from 'crypto'
import QRCode from 'qrcode'

/**
 * Generates a cryptographically secure random QR token.
 * 32 random bytes → 64-character lowercase hex string.
 * This is the value encoded into the physical QR code.
 */
export function generateQRToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Returns the SHA-256 hex digest of a raw token.
 * This is what gets stored in the database — never the raw token.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Generates a QR code PNG as a Base64 data URL string.
 * The QR encodes only the raw token — no personal information.
 */
export async function generateQRDataURL(rawToken: string): Promise<string> {
  return QRCode.toDataURL(rawToken, {
    errorCorrectionLevel: 'H',   // High error correction for durability
    margin: 2,
    width: 400,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

/**
 * Generates a QR code as a raw PNG Buffer (for server-side download/print).
 */
export async function generateQRBuffer(rawToken: string): Promise<Buffer> {
  return QRCode.toBuffer(rawToken, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  })
}
