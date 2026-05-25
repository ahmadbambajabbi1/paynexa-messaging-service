import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from '../../schemas/chat-room.schema';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

type TransactionCreatedPayload = {
  transactionId?: string;
  buyerId?: string;
  sellerId?: string;
};

@Injectable()
export class MessagingEventsListener implements OnModuleInit {
  private readonly logger = new Logger(MessagingEventsListener.name);

  constructor(
    private readonly rabbit: RabbitmqService,
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume(
      'safetrade.messaging-service',
      ['transaction.created'],
      async (routingKey, body) => {
        if (routingKey !== 'transaction.created') {
          return;
        }
        const payload = body as TransactionCreatedPayload;
        if (!payload.transactionId) {
          return;
        }
        const members = [payload.buyerId, payload.sellerId].filter(
          (id): id is string => Boolean(id),
        );
        await this.chatRoomModel.updateOne(
          { transactionId: payload.transactionId },
          {
            $setOnInsert: {
              transactionId: payload.transactionId,
              memberIds: members,
            },
          },
          { upsert: true },
        );
        this.logger.log(`Chat room ready for ${payload.transactionId}`);
      },
    );
  }
}
