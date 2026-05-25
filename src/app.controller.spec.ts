import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatRoom } from './schemas/chat-room.schema';
import { Message } from './schemas/message.schema';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getModelToken(Message.name),
          useValue: { create: jest.fn(), find: jest.fn() },
        },
        {
          provide: getModelToken(ChatRoom.name),
          useValue: { updateOne: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return service status', () => {
      expect(appController.health()).toEqual({
        service: 'messaging-service',
        status: 'ok',
      });
    });
  });
});
