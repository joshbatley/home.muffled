import nodemailer from "nodemailer";
import type { Config } from "../config.ts";
import { mailConfigured } from "../config.ts";

export function createMailer(cfg: Config) {
  const configured = mailConfigured(cfg);
  const transporter = configured
    ? nodemailer.createTransport({
        host: cfg.smtpHost,
        port: Number(cfg.smtpPort),
        auth: { user: cfg.smtpUser, pass: cfg.smtpPassword },
      })
    : null;

  return {
    configured: () => configured,
    send: async (to: string[], subject: string, body: string) => {
      if (!transporter || !configured) throw new Error("mail not configured");
      await transporter.sendMail({
        from: cfg.mailFrom,
        to,
        subject,
        text: body,
      });
    },
  };
}

export type Mailer = ReturnType<typeof createMailer>;
