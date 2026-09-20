import { Prisma, RequestType } from 'src/generated/prisma/client';

export interface ApprovalHandler<T = any> {
  /** The RequestType this handler processes */
  readonly type: RequestType;

  /**
   * Business logic executed when manager approves the request.
   * MUST run within the passed Prisma transaction client (tx).
   */
  execute(
    payload: T,
    tx: Prisma.TransactionClient,
    requestedById: number,
  ): Promise<void>;
}
