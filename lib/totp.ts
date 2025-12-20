import { authenticator } from "otplib";
import * as QRCode from "qrcode";

const APP_NAME = "BoxFrame";

/**
 * Generate a new TOTP secret
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate TOTP URI for QR code
 */
export function generateTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

/**
 * Generate QR code as data URL
 */
export async function generateQrCodeDataUrl(otpUri: string): Promise<string> {
  return QRCode.toDataURL(otpUri, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Verify TOTP token
 */
export function verifyTotp(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}
