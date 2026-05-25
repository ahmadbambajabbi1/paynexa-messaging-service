import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
  ) {}

  async postMessage(
    transactionId: string,
    body: {
      senderId: string;
      content: string;
      attachments?: {
        fileUrl: string;
        fileKey: string;
        uploader: string;
        timestamp?: string;
      }[];
      kind?: 'USER' | 'SYSTEM';
    },
  ): Promise<Record<string, unknown>> {
    await this.chatRoomModel.updateOne(
      { transactionId },
      {
        $setOnInsert: {
          transactionId,
          memberIds: [body.senderId],
        },
      },
      { upsert: true },
    );
    const attachments =
      body.attachments?.map((attachment) => ({
        fileUrl: attachment.fileUrl,
        fileKey: attachment.fileKey,
        uploader: attachment.uploader,
        timestamp: attachment.timestamp ?? new Date().toISOString(),
      })) ?? [];
    const doc = await this.messageModel.create({
      transactionId,
      senderId: body.senderId,
      content: body.content,
      kind: body.kind ?? 'USER',
      attachments,
    });
    const createdAt = doc.get('createdAt') as Date | undefined;
    return {
      transactionId,
      messageId: String(doc._id),
      timestamp: createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async history(transactionId: string): Promise<Record<string, unknown>> {
    const messages = await this.messageModel
      .find({ transactionId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    const mapped = messages.map((row) => {
      const message = row as typeof row & { createdAt?: Date };
      return {
        id: String(message._id),
        senderId: message.senderId,
        content: message.content,
        kind: message.kind,
        attachments: message.attachments,
        timestamp:
          message.createdAt instanceof Date
            ? message.createdAt.toISOString()
            : new Date().toISOString(),
      };
    });
    return {
      transactionId,
      messages: mapped,
      timeline: mapped.map((message) => ({
        event: message.kind === 'SYSTEM' ? 'system_message' : 'message',
        timestamp: message.timestamp,
      })),
    };
  }
}
