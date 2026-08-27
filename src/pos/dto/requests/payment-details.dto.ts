import { Type } from 'class-transformer';
import {
  IsDate,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CashDetailsDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cash_tendered!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  change_given!: number;
}

export class GCashDetailsDto {
  @IsNotEmpty()
  @IsString()
  reference_number!: string;

  @IsOptional()
  @IsString()
  gcash_mobile_number?: string;
}

export class CreditDetailsDto {
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}
