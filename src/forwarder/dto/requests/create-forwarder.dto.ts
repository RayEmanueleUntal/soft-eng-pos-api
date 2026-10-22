import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateForwarderDto {
  @ApiProperty({
    example: 'LBC Express',
    description: 'Unique company name of the courier or freight forwarder.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  company_name!: string;

  @ApiProperty({
    example: '+63 917 123 4567 / support@lbcexpress.com',
    description: 'Contact phone number, hotlines, or dispatch email info.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  tracking_contact_info!: string;
}
