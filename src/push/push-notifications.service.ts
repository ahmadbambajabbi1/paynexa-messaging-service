import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RabbitmqService } from '../infrastructure/rabbitmq/rabbitmq.service';

type PushPayload = {
  recipientId?: string;
  transactionId?: string;
  title?: string;
  body?: string;
  eventType?: string;
  notificationId?: string;
};

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);
  private messaging?: admin.messaging.Messaging;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbit: RabbitmqService,
  ) {}

  onModuleInit(): void {
    this.initFirebase();
  }

  private readServiceAccountJson(): string | null {
    const inline =
      this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim() ??
      this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS_JSON')?.trim();
    if (inline) return inline;

    const pathRaw =
      this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH')?.trim() ??
      this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim();
    if (!pathRaw) return null;

    const filePath = resolve(pathRaw);
    if (!existsSync(filePath)) {
      this.logger.warn(`Firebase service account file not found: ${filePath}`);
      return null;
    }
    return readFileSync(filePath, 'utf8');
  }

  private initFirebase(): void {
    if (admin.apps.length > 0) {
      this.messaging = admin.messaging();
      return;
    }
    const raw = this.readServiceAccountJson();
    if (!raw) {
      this.logger.warn(
        'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in messaging-service .env (download from Firebase Console → Project settings → Service accounts). Push notifications are disabled until then.',
      );
      return;
    }
    try {
      const credentials = JSON.parse(raw) as admin.ServiceAccount & {
        project_id?: string;
      };
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      this.messaging = admin.messaging();
      const projectLabel =
        credentials.projectId ?? credentials.project_id ?? 'paynexa-fc9ca';
      this.logger.log(`Firebase Admin initialized for project ${projectLabel}`);
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error as Error);
    }
  }

  async sendToUser(payload: PushPayload): Promise<void> {
    if (!payload.recipientId || !payload.body) {
      this.logger.warn('notification.push missing recipientId or body');
      return;
    }
    if (!this.messaging) {
      this.logger.warn(
        `FCM skipped for ${payload.recipientId}: Firebase Admin not initialized`,
      );
      return;
    }
    let items: Array<{ token: string }> = [];
    try {
      const body = await this.rabbit.rpc<{ items?: Array<{ token: string }> }>(
        'user.rpc.push-tokens.list',
        { userId: payload.recipientId },
      );
      items = body.items ?? [];
    } catch (error) {
      this.logger.warn(
        `Could not resolve push tokens for ${payload.recipientId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }
    const tokens = items.map((row) => row.token).filter(Boolean);
    if (tokens.length === 0) {
      this.logger.warn(
        `No FCM tokens for user ${payload.recipientId}. User must open PayNexa app or web and allow notifications.`,
      );
      return;
    }
    const data: Record<string, string> = {
      eventType: payload.eventType ?? 'transaction.notification',
    };
    if (payload.transactionId) {
      data.transactionId = payload.transactionId;
    }
    if (payload.notificationId) {
      data.notificationId = payload.notificationId;
    }
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title ?? 'PayNexa',
        body: payload.body,
      },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'paynexa_transactions',
          sound: 'default',
        },
      },
      apns: { payload: { aps: { sound: 'default' } } },
      webpush: {
        fcmOptions: {
          link: payload.transactionId
            ? `/transactions/${payload.transactionId}`
            : '/notifications',
        },
      },
    };
    const result = await this.messaging.sendEachForMulticast(message);
    if (result.failureCount > 0) {
      result.responses.forEach((resp, idx) => {
        if (!resp.success) {
          this.logger.warn(
            `FCM token failed for user ${payload.recipientId}: ${resp.error?.message ?? 'unknown'} (token …${tokens[idx]?.slice(-8) ?? ''})`,
          );
        }
      });
      this.logger.warn(
        `FCM partial failure for user ${payload.recipientId}: ${result.failureCount}/${tokens.length}`,
      );
    }
    if (result.successCount > 0) {
      this.logger.log(
        `FCM sent to user ${payload.recipientId} (${result.successCount}/${tokens.length} devices)`,
      );
    }
  }

  // Marketplace booking push — enable when product-service publishes marketplace.notification.push.
  // async sendMarketplaceBooking(payload: PushPayload & { bookingId?: string }): Promise<void> {
  //   await this.sendToUser({
  //     ...payload,
  //     eventType: payload.eventType ?? 'marketplace.booking',
  //   });
  // }
}
