import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBinLocDto {
  @IsNotEmpty()
  @IsString()
  aisle_number!: string;

  @IsNotEmpty()
  @IsString()
  shelf_location!: string;
}
