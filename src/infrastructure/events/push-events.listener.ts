import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PushNotificationsService } from '../../push/push-notifications.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

type NotificationPushPayload = {
  recipientId?: string;
  transactionId?: string;
  title?: string;
  body?: string;
  eventType?: string;
  notificationId?: string;
};

@Injectable()
export class PushEventsListener implements OnModuleInit {
  private readonly logger = new Logger(PushEventsListener.name);

  constructor(
    private readonly rabbit: RabbitmqService,
    private readonly push: PushNotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume(
      'safetrade.messaging-service.push',
      ['notification.push'],
      async (routingKey, body) => {
        if (routingKey !== 'notification.push') {
          return;
        }
        const payload = body as NotificationPushPayload;
        await this.push.sendToUser(payload);
        this.logger.log(
          `Handled notification.push for ${payload.recipientId ?? 'unknown'}`,
        );
      },
    );

    // Marketplace booking push consumer — enable when product-service emits events.
    // await this.rabbit.consume(
    //   'safetrade.messaging-service.marketplace-push',
    //   ['marketplace.notification.push'],
    //   async (routingKey, body) => {
    //     if (routingKey !== 'marketplace.notification.push') return;
    //     await this.push.sendMarketplaceBooking(body as NotificationPushPayload);
    //   },
    // );
  }
}
