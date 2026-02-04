import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * License payload structure for offline validation
 */
export interface OfflineLicensePayload {
  /** Client code identifier */
  code: string;
  /** Company/Client name */
  companyName: string;
  /** Product name */
  product: string;
  /** Maximum number of users allowed */
  maxUsers: number;
  /** License expiration date (ISO 8601) */
  expiresAt: string | null;
  /** License issue date (ISO 8601) */
  issuedAt: string;
  /** Unique license identifier */
  licenseId: string;
  /** License key */
  licenseKey: string;
}

/**
 * Complete offline license token structure
 */
export interface OfflineLicenseToken {
  /** License data payload */
  data: OfflineLicensePayload;
  /** RSA signature of the data (base64) */
  signature: string;
  /** Algorithm used for signing */
  algorithm: string;
  /** Version of the token format */
  version: number;
}

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private privateKey: string | null = null;
  private publicKey: string | null = null;

  // Key configuration
  private readonly KEY_SIZE = 2048;
  private readonly ALGORITHM = 'RSA-SHA256';
  private readonly KEY_DIR = process.env.LICENSE_KEY_DIR || './keys';
  private readonly PRIVATE_KEY_FILE = 'license-private.pem';
  private readonly PUBLIC_KEY_FILE = 'license-public.pem';

  async onModuleInit() {
    await this.loadOrGenerateKeys();
  }

  /**
   * Load existing keys or generate new ones if they don't exist
   */
  private async loadOrGenerateKeys(): Promise<void> {
    const privateKeyPath = path.join(this.KEY_DIR, this.PRIVATE_KEY_FILE);
    const publicKeyPath = path.join(this.KEY_DIR, this.PUBLIC_KEY_FILE);

    // Check if keys exist in environment variables first (for production)
    if (process.env.LICENSE_PRIVATE_KEY && process.env.LICENSE_PUBLIC_KEY) {
      this.privateKey = process.env.LICENSE_PRIVATE_KEY.replace(/\\n/g, '\n');
      this.publicKey = process.env.LICENSE_PUBLIC_KEY.replace(/\\n/g, '\n');
      this.logger.log('Loaded license keys from environment variables');
      return;
    }

    // Check if key files exist
    try {
      if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        this.logger.log('Loaded license keys from files');
        return;
      }
    } catch {
      this.logger.warn('Could not load existing keys, generating new ones');
    }

    // Generate new keys
    await this.generateAndSaveKeys();
  }

  /**
   * Generate new RSA key pair and save to files
   */
  private async generateAndSaveKeys(): Promise<void> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: this.KEY_SIZE,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        },
        (err, publicKey, privateKey) => {
          if (err) {
            this.logger.error('Failed to generate key pair', err);
            reject(err);
            return;
          }

          this.publicKey = publicKey;
          this.privateKey = privateKey;

          // Try to save keys to files
          try {
            if (!fs.existsSync(this.KEY_DIR)) {
              fs.mkdirSync(this.KEY_DIR, { recursive: true });
            }

            fs.writeFileSync(
              path.join(this.KEY_DIR, this.PRIVATE_KEY_FILE),
              privateKey,
              { mode: 0o600 },
            );
            fs.writeFileSync(
              path.join(this.KEY_DIR, this.PUBLIC_KEY_FILE),
              publicKey,
              { mode: 0o644 },
            );

            this.logger.log(
              `Generated and saved new license keys to ${this.KEY_DIR}`,
            );
          } catch (saveErr) {
            this.logger.warn(
              'Could not save keys to files, they will be regenerated on restart',
              saveErr,
            );
          }

          resolve();
        },
      );
    });
  }

  /**
   * Get the public key (safe to share with clients)
   */
  getPublicKey(): string {
    if (!this.publicKey) {
      throw new Error('Public key not initialized');
    }
    return this.publicKey;
  }

  /**
   * Sign the license payload and create a complete offline token
   */
  signLicensePayload(payload: OfflineLicensePayload): OfflineLicenseToken {
    if (!this.privateKey) {
      throw new Error('Private key not initialized');
    }

    // Create a canonical JSON string for signing
    const dataString = JSON.stringify(payload);

    // Create signature
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(dataString);
    sign.end();

    const signature = sign.sign(this.privateKey, 'base64');

    return {
      data: payload,
      signature,
      algorithm: this.ALGORITHM,
      version: 1,
    };
  }

  /**
   * Generate a compact offline license token (base64 encoded)
   */
  generateOfflineLicenseToken(payload: OfflineLicensePayload): string {
    const token = this.signLicensePayload(payload);
    const tokenJson = JSON.stringify(token);
    return Buffer.from(tokenJson).toString('base64');
  }

  /**
   * Decode and verify an offline license token
   * Returns the payload if valid, throws error if invalid
   */
  verifyOfflineLicenseToken(tokenBase64: string): OfflineLicensePayload {
    if (!this.publicKey) {
      throw new Error('Public key not initialized');
    }

    try {
      // Decode the token
      const tokenJson = Buffer.from(tokenBase64, 'base64').toString('utf8');
      const token: OfflineLicenseToken = JSON.parse(tokenJson);

      // Verify version
      if (token.version !== 1) {
        throw new Error('Unsupported token version');
      }

      // Recreate the canonical data string
      const dataString = JSON.stringify(token.data);

      // Verify signature
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(dataString);
      verify.end();

      const isValid = verify.verify(this.publicKey, token.signature, 'base64');

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      return token.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`License verification failed: ${error.message}`);
      }
      throw new Error('License verification failed: Unknown error');
    }
  }

  /**
   * Validate license data (check expiration, etc.)
   */
  validateLicensePayload(payload: OfflineLicensePayload): {
    valid: boolean;
    expired: boolean;
    message: string;
  } {
    // Check expiration
    if (payload.expiresAt) {
      const expirationDate = new Date(payload.expiresAt);
      const now = new Date();

      if (expirationDate < now) {
        return {
          valid: false,
          expired: true,
          message: `License expired on ${expirationDate.toISOString()}`,
        };
      }
    }

    return {
      valid: true,
      expired: false,
      message: 'License is valid',
    };
  }
}
