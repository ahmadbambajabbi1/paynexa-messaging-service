import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatRoomDocument = HydratedDocument<ChatRoom>;

@Schema({ timestamps: true, collection: 'chat_rooms' })
export class ChatRoom {
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  transactionId!: string;

  @Prop({ type: [String], default: [] })
  memberIds!: string[];
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
