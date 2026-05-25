import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('messages')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health(): { service: string; status: string } {
    return { service: 'messaging-service', status: 'ok' };
  }

  @Post(':transactionId')
  postMessage(
    @Param('transactionId') transactionId: string,
    @Body()
    body: {
      senderId: string;
      content: string;
      attachments?: { fileUrl: string; fileKey: string; uploader: string; timestamp?: string }[];
      kind?: 'USER' | 'SYSTEM';
    },
  ): Promise<Record<string, unknown>> {
    return this.appService.postMessage(transactionId, body);
  }

  @Get(':transactionId/history')
  history(
    @Param('transactionId') transactionId: string,
  ): Promise<Record<string, unknown>> {
    return this.appService.history(transactionId);
  }
}
