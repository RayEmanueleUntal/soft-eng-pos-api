import { ApiProperty } from '@nestjs/swagger';

export class ReceiptCustomerDto {
  @ApiProperty({ example: 'Juan Dela Cruz', description: 'Customer full name' })
  name!: string;

  @ApiProperty({
    example: '09171234567',
    description: 'Customer contact phone number',
  })
  number!: string;
}
