import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Attachment, AttachmentSchema } from './attachment.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  _id!: Types.ObjectId;

  @Prop({ required: true, index: true })
  transactionId!: string;

  @Prop({ required: true })
  senderId!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ enum: ['USER', 'SYSTEM'], default: 'USER' })
  kind!: string;

  @Prop({ type: [AttachmentSchema], default: [] })
  attachments!: Attachment[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
