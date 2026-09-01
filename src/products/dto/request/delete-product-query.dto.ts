import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteProductQueryDto {
  @ApiPropertyOptional({
    default: false,
    example: false,
    description:
      'If true, forces permanent hard deletion even if history checks pass. Hard deletion fails if transaction records exist.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  forceHardDelete?: boolean = false;
}
