import { Controller } from '@nestjs/common';
import { ForwarderService } from './forwarder.service';

@Controller('forwarder')
export class ForwarderController {
  constructor(private readonly forwarderService: ForwarderService) {}
}
