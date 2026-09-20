import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApprovalRegistry } from './approval-registry.service';
import {
  ApprovalRequestResponseDto,
  CreateApprovalRequestDto,
  ReviewApprovalRequestDto,
} from './dto';
import { RequestStatus, RequestType } from 'src/generated/prisma/enums';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ApprovalRegistry,
  ) {}

  async createRequest(
    dto: CreateApprovalRequestDto,
    requestedById: number,
  ): Promise<ApprovalRequestResponseDto> {
    // Ensure a handler exists for this type BEFORE creating request
    this.registry.getHandler(dto.type);

    const request = await this.prisma.approvalRequest.create({
      data: {
        type: dto.type,
        payload: dto.payload,
        requestedById,
        status: RequestStatus.PENDING,
      },
    });

    this.logger.log(
      `Approval request #${request.id} (${request.type}) created by Staff #${requestedById}`,
    );
    return ApprovalRequestResponseDto.fromEntity(request);
  }

  async approveRequest(
    requestId: number,
    managerId: number,
  ): Promise<ApprovalRequestResponseDto> {
    this.logger.log(
      `Manager #${managerId} attempting to approve request #${requestId}`,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundException(`Approval request #${requestId} not found`);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException(
          `Approval request #${requestId} is already ${request.status}`,
        );
      }

      // 1. Resolve domain handler
      const handler = this.registry.getHandler(request.type);

      // 2. Execute feature domain logic in the transaction
      await handler.execute(request.payload, tx, request.requestedById);

      // 3. Mark request as APPROVED
      return tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.APPROVED,
          reviewedById: managerId,
        },
      });
    });

    this.logger.log(
      `Approval request #${requestId} successfully executed and approved.`,
    );
    return ApprovalRequestResponseDto.fromEntity(result);
  }

  async rejectRequest(
    requestId: number,
    managerId: number,
    dto: ReviewApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Approval request #${requestId} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Approval request #${requestId} is already ${request.status}`,
      );
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        reviewedById: managerId,
        rejectionReason: dto.rejectionReason,
      },
    });

    this.logger.log(
      `Approval request #${requestId} rejected by Manager #${managerId}`,
    );
    return ApprovalRequestResponseDto.fromEntity(updated);
  }

  async findAll(filter?: {
    status?: RequestStatus;
    type?: RequestType;
  }): Promise<ApprovalRequestResponseDto[]> {
    this.logger.log(
      `Fetching approval requests with filters: ${JSON.stringify(filter)}`,
    );

    const requests = await this.prisma.approvalRequest.findMany({
      where: {
        ...(filter?.status && { status: filter.status }),
        ...(filter?.type && { type: filter.type }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ApprovalRequestResponseDto.fromEntity(req));
  }

  async findOne(id: number): Promise<ApprovalRequestResponseDto> {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Approval request #${id} not found`);
    }

    return ApprovalRequestResponseDto.fromEntity(request);
  }
}
