import { Type } from 'class-transformer';
import { IsNotEmpty, IsPositive } from 'class-validator';

export class AssignBinDto {
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  binId!: number;
}
