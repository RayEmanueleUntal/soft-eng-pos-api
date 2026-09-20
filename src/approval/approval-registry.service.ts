import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { RequestType } from 'src/generated/prisma/client';
import { ApprovalHandler } from './interfaces/approval-handler.interface';

@Injectable()
export class ApprovalRegistry {
  private readonly logger = new Logger(ApprovalRegistry.name);
  private readonly handlers = new Map<RequestType, ApprovalHandler>();

  register(handler: ApprovalHandler) {
    if (this.handlers.has(handler.type)) {
      this.logger.warn(
        `Overwriting approval handler for type: ${handler.type}`,
      );
    }
    this.handlers.set(handler.type, handler);
    this.logger.log(`Registered approval handler for: ${handler.type}`);
  }

  getHandler(type: RequestType): ApprovalHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      this.logger.error(`No approval handler registered for type: ${type}`);
      throw new BadRequestException(
        `No approval handler configured for request type: "${type}"`,
      );
    }
    return handler;
  }
}
