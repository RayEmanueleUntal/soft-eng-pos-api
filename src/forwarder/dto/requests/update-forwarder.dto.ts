import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateForwarderDto } from './create-forwarder.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateForwarderDto extends PartialType(CreateForwarderDto) {
  @ApiPropertyOptional({
    example: true,
    description:
      'Active status of the forwarder. Set to false to disable for future dispatches.',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
