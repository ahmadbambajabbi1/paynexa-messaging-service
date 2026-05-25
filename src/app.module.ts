import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagingEventsListener } from './infrastructure/events/messaging-events.listener';
import { RabbitmqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { Message, MessageSchema } from './schemas/message.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://localhost:27017/safetrade-messaging',
      }),
    }),
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: ChatRoom.name, schema: ChatRoomSchema },
    ]),
    RabbitmqModule,
  ],
  controllers: [AppController],
  providers: [AppService, MessagingEventsListener],
})
export class AppModule {}
