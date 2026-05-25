import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Attachment {
  @Prop({ required: true })
  fileUrl!: string;

  @Prop({ required: true })
  fileKey!: string;

  @Prop({ required: true })
  uploader!: string;

  @Prop({ required: true })
  timestamp!: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
