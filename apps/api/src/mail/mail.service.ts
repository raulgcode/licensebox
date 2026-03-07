import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const fromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'noreply@licensebox.app',
    );

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Recuperación de contraseña - LicenseBox',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body style="font-family: sans-serif; background: #f9fafb; margin: 0; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
                <tr>
                  <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <tr>
                        <td>
                          <h1 style="margin: 0 0 8px; font-size: 24px; color: #111827;">LicenseBox</h1>
                          <h2 style="margin: 0 0 24px; font-size: 18px; color: #374151; font-weight: 500;">Recuperación de contraseña</h2>
                          <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
                            Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón a continuación para continuar.
                          </p>
                          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                            Restablecer contraseña
                          </a>
                          <p style="color: #9ca3af; margin: 24px 0 0; font-size: 13px; line-height: 1.6;">
                            Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
                          </p>
                          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                          <p style="color: #d1d5db; margin: 0; font-size: 12px;">
                            Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                            <a href="${resetUrl}" style="color: #9ca3af; word-break: break-all;">${resetUrl}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }
}
