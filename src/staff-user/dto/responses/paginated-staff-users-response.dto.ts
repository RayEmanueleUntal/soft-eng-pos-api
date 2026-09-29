import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/transactions/dto/responses/pagination-meta.dto';
import { StaffUserResponseDto } from './staff-user-response.dto';

export class PaginatedStaffUsersResponseDto {
  @ApiProperty({ type: [StaffUserResponseDto] })
  data!: StaffUserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromEntities(
    staffUsers: any[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedStaffUsersResponseDto {
    return {
      data: staffUsers.map(StaffUserResponseDto.fromEntity),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
