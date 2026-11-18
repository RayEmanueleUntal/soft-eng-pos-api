import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AccountsReceivableQueryDto,
  AccountsReceivableResponseDto,
  AnalyticsQueryDto,
  ArAgingItemDto,
  CategoryBreakdownItemDto,
  CreditOverviewDto,
  DashboardSummaryResponseDto,
  ExpenseAnalyticsQueryDto,
  ExpenseAnalyticsResponseDto,
  ExpenseListItemDto,
  FastMovingItemDto,
  FastMovingSortBy,
  GroupingInterval,
  InventoryVelocityQueryDto,
  InventoryVelocityResponseDto,
  PaymentMethodBreakdownDto,
  SalesPerformanceQueryDto,
  SalesPerformanceResponseDto,
  SalesTrendDataPointDto,
  SlowMovingItemDto,
  SummaryLedgerDto,
  TopCreditCustomerDto,
} from './dto';
import { InvalidDateRangeException } from 'src/common/exceptions';
import {
  CreditStatus,
  ItemCondition,
  MovementType,
  TransactionStatus,
} from 'src/generated/prisma/enums';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates real-time high-level KPI metrics for the executive dashboard.
   * Accounts for COMPLETED & PARTIALLY_REFUNDED transactions, deducts refund amounts
   * from revenue, and reverses COGS only for sellable (CHANGE_OF_MIND) returns.
   *
   * @param query AnalyticsQueryDto containing optional startDate and endDate
   * @returns DashboardSummaryResponseDto
   */
  async getDashboardSummary(
    query: AnalyticsQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    const { startDate, endDate } = query;

    if (startDate && endDate && startDate > endDate) {
      this.logger.warn(
        `Invalid date range requested: startDate=${startDate.toISOString()} > endDate=${endDate.toISOString()}`,
      );
      throw new InvalidDateRangeException();
    }

    this.logger.log(
      `Fetching dashboard summary: startDate=${startDate?.toISOString() ?? 'ALL'}, endDate=${endDate?.toISOString() ?? 'ALL'}`,
    );

    // Build common date filter clause for transactions, returns, and expenses
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Include both COMPLETED and PARTIALLY_REFUNDED so partial returns don't wipe out valid sales
    const validStatuses = [
      TransactionStatus.COMPLETED,
      TransactionStatus.PARTIALLY_REFUNDED,
    ];

    const transactionWhere = {
      status: { in: validStatuses },
      ...(hasDateFilter && { date: dateFilter }),
    };

    const returnWhere = {
      ...(hasDateFilter && { date: dateFilter }),
      // Only deduct returns for transactions that are still counted in grossRevenue!
      // Fully REFUNDED transactions are already excluded from transactionWhere.
      transaction: {
        status: { in: validStatuses },
      },
    };

    const expenseWhere = {
      ...(hasDateFilter && { date: dateFilter }),
    };

    // Execute queries concurrently for high performance
    const [
      revenueAggregate,
      transactionItems,
      returns,
      expenseAggregate,
      arAggregate,
    ] = await Promise.all([
      // 1. Gross Sales Revenue (before refunds)
      this.prisma.transaction.aggregate({
        _sum: { grand_total: true },
        where: transactionWhere,
      }),

      // 2. Fetch Transaction Items to calculate Gross COGS
      this.prisma.transactionItem.findMany({
        where: {
          transaction: transactionWhere,
        },
        select: {
          base_quantity_deducted: true,
          cost_price: true,
        },
      }),

      // 3. Fetch Returns within the period to adjust Net Revenue & sellable COGS
      this.prisma.return.findMany({
        where: returnWhere,
        select: {
          transactionId: true,
          productId: true,
          quantity: true,
          condition: true,
          refund_amount: true,
          product: {
            select: { cost_price: true },
          },
          transaction: {
            select: {
              transactionItems: {
                select: {
                  productId: true,
                  cost_price: true,
                },
              },
            },
          },
        },
      }),

      // 4. Total OpEx (General Expenses)
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: expenseWhere,
      }),

      // 5. Total Active Accounts Receivable (Point-in-time outstanding debt)
      this.prisma.wholeSaleCustomer.aggregate({
        _sum: { outstanding_balance: true },
      }),
    ]);

    // Parse aggregated values securely (Fallback to 0 if null)
    const grossRevenue = revenueAggregate._sum.grand_total
      ? Number(revenueAggregate._sum.grand_total)
      : 0;

    const totalOpEx = expenseAggregate._sum.amount
      ? Number(expenseAggregate._sum.amount)
      : 0;

    const totalActiveReceivables = arAggregate._sum.outstanding_balance
      ? Number(arAggregate._sum.outstanding_balance)
      : 0;

    // Calculate Gross COGS: Sum of (base_quantity_deducted * cost_price) for each sold item
    const grossCogs = transactionItems.reduce((acc, item) => {
      const itemCogs =
        Number(item.base_quantity_deducted) * Number(item.cost_price);
      return acc + itemCogs;
    }, 0);

    // Process Returns: Sum total refunds & compute COGS reversal for CHANGE_OF_MIND items
    let totalRefunds = 0;
    let recoveredCogs = 0;

    for (const ret of returns) {
      totalRefunds += Number(ret.refund_amount);

      // Only CHANGE_OF_MIND items return to sellable stock; DEFECTIVE items remain a loss in COGS
      if (ret.condition === ItemCondition.CHANGE_OF_MIND) {
        const matchedLineItem = ret.transaction.transactionItems.find(
          (ti) => ti.productId === ret.productId,
        );
        const unitCost = matchedLineItem
          ? Number(matchedLineItem.cost_price)
          : Number(ret.product.cost_price);

        recoveredCogs += Number(ret.quantity) * unitCost;
      }
    }

    // Net Revenue & Net COGS after Return adjustments
    const totalRevenue = Math.max(0, grossRevenue - totalRefunds);
    const totalCogs = Math.max(0, grossCogs - recoveredCogs);

    // Profit and Margin Calculations
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercentage =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const netProfit = grossProfit - totalOpEx;
    const netMarginPercentage =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    this.logger.log(
      `Dashboard summary computed: NetRevenue=${totalRevenue} (Gross=${grossRevenue}, Refunds=${totalRefunds}), NetCOGS=${totalCogs} (Recovered=${recoveredCogs}), GrossProfit=${grossProfit}, OpEx=${totalOpEx}, NetProfit=${netProfit}, AR=${totalActiveReceivables}`,
    );

    return DashboardSummaryResponseDto.fromMetrics({
      totalRevenue,
      totalCogs,
      grossProfit,
      grossMarginPercentage,
      totalOpEx,
      netProfit,
      netMarginPercentage,
      totalActiveReceivables,
    });
  }

  /**
   * Generates Sales & Net Profit trend, payment method breakdown, and summary ledger.
   * Accounts for COMPLETED & PARTIALLY_REFUNDED transactions, deducts refund amounts
   * from revenue buckets/totals, and reverses COGS only for sellable (CHANGE_OF_MIND) returns.
   *
   * @param query SalesPerformanceQueryDto
   * @returns SalesPerformanceResponseDto
   */
  async getSalesPerformance(
    query: SalesPerformanceQueryDto,
  ): Promise<SalesPerformanceResponseDto> {
    const { startDate, endDate, interval = GroupingInterval.DAILY } = query;

    if (startDate && endDate && startDate > endDate) {
      this.logger.warn(
        `Invalid date range in getSalesPerformance: startDate=${startDate.toISOString()} > endDate=${endDate.toISOString()}`,
      );
      throw new InvalidDateRangeException();
    }

    this.logger.log(
      `Fetching sales performance analytics: startDate=${startDate?.toISOString() ?? 'ALL'}, endDate=${endDate?.toISOString() ?? 'ALL'}, interval=${interval}`,
    );

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Include COMPLETED and PARTIALLY_REFUNDED so partial returns remain represented
    const validStatuses = [
      TransactionStatus.COMPLETED,
      TransactionStatus.PARTIALLY_REFUNDED,
    ];

    const transactionWhere = {
      status: { in: validStatuses },
      ...(hasDateFilter && { date: dateFilter }),
    };

    const returnWhere = {
      ...(hasDateFilter && { date: dateFilter }),
      // Only deduct returns for transactions that are still counted in grossRevenue!
      // Fully REFUNDED transactions are already excluded from transactionWhere.
      transaction: {
        status: { in: validStatuses },
      },
    };

    const expenseWhere = {
      ...(hasDateFilter && { date: dateFilter }),
    };

    // Parallel Database Execution
    const [transactions, returns, expenses, payments] = await Promise.all([
      // 1. Fetch Valid Transactions with items
      this.prisma.transaction.findMany({
        where: transactionWhere,
        select: {
          id: true,
          date: true,
          grand_total: true,
          discount_total: true,
          transactionItems: {
            select: {
              base_quantity_deducted: true,
              cost_price: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      }),

      // 2. Fetch Returns within period for Revenue & sellable COGS adjustments
      this.prisma.return.findMany({
        where: returnWhere,
        select: {
          transactionId: true,
          productId: true,
          quantity: true,
          date: true,
          condition: true,
          refund_amount: true,
          product: {
            select: { cost_price: true },
          },
          transaction: {
            select: {
              transactionItems: {
                select: {
                  productId: true,
                  cost_price: true,
                },
              },
            },
          },
        },
      }),

      // 3. Fetch Expenses for interval Net Profit calculation
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: {
          date: true,
          amount: true,
        },
      }),

      // 4. Fetch Payments associated with valid transactions
      this.prisma.payment.findMany({
        where: {
          transaction: transactionWhere,
        },
        select: {
          payment_method: true,
          amount_paid: true,
        },
      }),
    ]);

    // Format Date Helper for Grouping
    const getPeriodLabel = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      if (interval === GroupingInterval.MONTHLY) {
        return `${year}-${month}`;
      } else if (interval === GroupingInterval.WEEKLY) {
        // ISO Week Number calculation
        const target = new Date(date.valueOf());
        const dayNr = (date.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setUTCMonth(0, 1);
        if (target.getUTCDay() !== 4) {
          target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
        }
        const weekNum =
          1 + Math.round((firstThursday - target.valueOf()) / 604800000);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      }
      return `${year}-${month}-${day}`;
    };

    // Grouping Trends
    const trendMap = new Map<
      string,
      { revenue: number; cogs: number; opex: number }
    >();

    let grossRevenue = 0;
    let totalDiscounts = 0;
    let grossCogs = 0;

    for (const tx of transactions) {
      const label = getPeriodLabel(tx.date);
      const rev = Number(tx.grand_total);
      const disc = Number(tx.discount_total);

      const txCogs = tx.transactionItems.reduce((acc, item) => {
        return (
          acc + Number(item.base_quantity_deducted) * Number(item.cost_price)
        );
      }, 0);

      grossRevenue += rev;
      totalDiscounts += disc;
      grossCogs += txCogs;

      const current = trendMap.get(label) || { revenue: 0, cogs: 0, opex: 0 };
      trendMap.set(label, {
        revenue: current.revenue + rev,
        cogs: current.cogs + txCogs,
        opex: current.opex,
      });
    }

    // Apply Returns into Trend buckets & Summary totals
    let totalRefunds = 0;
    let recoveredCogs = 0;

    for (const ret of returns) {
      const label = getPeriodLabel(ret.date);
      const refundAmt = Number(ret.refund_amount);
      totalRefunds += refundAmt;

      let itemRecoveredCogs = 0;
      // Only CHANGE_OF_MIND items return to sellable stock; DEFECTIVE items remain a loss in COGS
      if (ret.condition === ItemCondition.CHANGE_OF_MIND) {
        const matchedLineItem = ret.transaction.transactionItems.find(
          (ti) => ti.productId === ret.productId,
        );
        const unitCost = matchedLineItem
          ? Number(matchedLineItem.cost_price)
          : Number(ret.product.cost_price);

        itemRecoveredCogs = Number(ret.quantity) * unitCost;
        recoveredCogs += itemRecoveredCogs;
      }

      const current = trendMap.get(label) || { revenue: 0, cogs: 0, opex: 0 };
      trendMap.set(label, {
        revenue: current.revenue - refundAmt,
        cogs: current.cogs - itemRecoveredCogs,
        opex: current.opex,
      });
    }

    // Map OpEx into Trend buckets
    for (const exp of expenses) {
      const label = getPeriodLabel(exp.date);
      const expAmt = Number(exp.amount);
      const current = trendMap.get(label) || { revenue: 0, cogs: 0, opex: 0 };
      trendMap.set(label, {
        ...current,
        opex: current.opex + expAmt,
      });
    }

    // Convert Trend Map to Sorted Array
    const trend: SalesTrendDataPointDto[] = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date_label, data]) => {
        const netPeriodRevenue = Math.max(0, data.revenue);
        const netPeriodCogs = Math.max(0, data.cogs);
        return {
          date_label,
          revenue: Number(netPeriodRevenue.toFixed(2)),
          net_profit: Number(
            (netPeriodRevenue - netPeriodCogs - data.opex).toFixed(2),
          ),
        };
      });

    // Payment Method Breakdown Calculation
    const paymentMap = new Map<string, number>();
    let totalPaymentsAmount = 0;

    for (const p of payments) {
      const methodKey = p.payment_method
        ? String(p.payment_method)
        : 'UNCATEGORIZED';
      const amt = Number(p.amount_paid);
      totalPaymentsAmount += amt;

      const currentAmt = paymentMap.get(methodKey) || 0;
      paymentMap.set(methodKey, currentAmt + amt);
    }

    const payment_breakdown: PaymentMethodBreakdownDto[] = Array.from(
      paymentMap.entries(),
    ).map(([payment_method, total_amount]) => ({
      payment_method,
      total_amount: Number(total_amount.toFixed(2)),
      percentage_share:
        totalPaymentsAmount > 0
          ? Number(((total_amount / totalPaymentsAmount) * 100).toFixed(2))
          : 0,
    }));

    // Summary Ledger Calculation (Net of Refunds & Sellable Return Cost Recovery)
    const netTotalRevenue = Math.max(0, grossRevenue - totalRefunds);
    const netTotalCogs = Math.max(0, grossCogs - recoveredCogs);
    const grossProfit = netTotalRevenue - netTotalCogs;
    const grossMarginPct =
      netTotalRevenue > 0 ? (grossProfit / netTotalRevenue) * 100 : 0;

    const summary_ledger: SummaryLedgerDto = {
      total_revenue: Number(netTotalRevenue.toFixed(2)),
      total_discounts: Number(totalDiscounts.toFixed(2)),
      total_cogs: Number(netTotalCogs.toFixed(2)),
      gross_profit: Number(grossProfit.toFixed(2)),
      gross_profit_margin_percentage: Number(grossMarginPct.toFixed(2)),
    };

    return {
      trend,
      payment_breakdown,
      summary_ledger,
    };
  }

  /**
   * Generates Operational Expenses (OpEx) Report.
   * Provides spending breakdown by category and paginated expense table entries.
   * Note: Customer refunds, 1-to-1 exchanges, and inventory Purchase Orders are
   * excluded from OpEx as they are accounted for in Net Revenue, COGS, and Inventory Assets.
   *
   * @param query ExpenseAnalyticsQueryDto
   * @returns ExpenseAnalyticsResponseDto
   */
  async getExpenseAnalytics(
    query: ExpenseAnalyticsQueryDto,
  ): Promise<ExpenseAnalyticsResponseDto> {
    const {
      startDate,
      endDate,
      category,
      payment_method,
      page = 1,
      limit = 10,
    } = query;

    if (startDate && endDate && startDate > endDate) {
      this.logger.warn(
        `Invalid date range in getExpenseAnalytics: startDate=${startDate.toISOString()} > endDate=${endDate.toISOString()}`,
      );
      throw new InvalidDateRangeException();
    }

    this.logger.log(
      `Fetching expense analytics report: startDate=${startDate?.toISOString() ?? 'ALL'}, endDate=${endDate?.toISOString() ?? 'ALL'}, category=${category ?? 'ALL'}, payment_method=${payment_method ?? 'ALL'}`,
    );

    // Build Prisma Where Clause
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const whereClause = {
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      ...(category && { category }),
      ...(payment_method && { payment_method }),
    };

    const skip = (page - 1) * limit;

    // Parallel DB Execution
    const [totalAggregate, categoryGroups, expenses, totalCount] =
      await Promise.all([
        // 1. Total OpEx Sum
        this.prisma.expense.aggregate({
          _sum: { amount: true },
          where: whereClause,
        }),

        // 2. Category Breakdown Aggregation
        this.prisma.expense.groupBy({
          by: ['category'],
          _sum: { amount: true },
          _count: { id: true },
          where: whereClause,
        }),

        // 3. Paginated Expense List Table with Staff details
        this.prisma.expense.findMany({
          where: whereClause,
          include: {
            staff: {
              select: {
                id: true,
                username: true,
                first_name: true,
                last_name: true,
              },
            },
          },
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
        }),

        // 4. Total Count for Pagination
        this.prisma.expense.count({
          where: whereClause,
        }),
      ]);

    const totalOpEx = totalAggregate._sum.amount
      ? Number(totalAggregate._sum.amount)
      : 0;

    // Format Category Breakdown with percentage share, ordered from highest spend to lowest
    const category_breakdown: CategoryBreakdownItemDto[] = categoryGroups
      .map((group) => {
        const categoryAmount = group._sum.amount
          ? Number(group._sum.amount)
          : 0;
        const logCount = group._count.id;
        const percentageShare =
          totalOpEx > 0 ? (categoryAmount / totalOpEx) * 100 : 0;

        return {
          category: group.category,
          total_amount: Number(categoryAmount.toFixed(2)),
          log_count: logCount,
          percentage_share: Number(percentageShare.toFixed(2)),
        };
      })
      .sort((a, b) => b.total_amount - a.total_amount);

    // Format Detailed Expense List
    const expense_list: ExpenseListItemDto[] = expenses.map((exp) => ({
      id: exp.id,
      date: exp.date,
      category: exp.category,
      payment_method: exp.payment_method,
      amount: Number(Number(exp.amount).toFixed(2)),
      notes: exp.notes,
      staff: {
        id: exp.staff.id,
        username: exp.staff.username,
        full_name: `${exp.staff.first_name} ${exp.staff.last_name}`.trim(),
      },
    }));

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      total_opex: Number(totalOpEx.toFixed(2)),
      category_breakdown,
      expense_list,
      pagination: {
        total_count: totalCount,
        total_pages: totalPages,
        current_page: page,
        limit,
      },
    };
  }

  /**
   * Generates Product Inventory Velocity Report (Fast & Slow-Moving / Dead Stock Items).
   * Accounts for COMPLETED & PARTIALLY_REFUNDED transactions, deducts returned base
   * quantities and refund amounts from product sales totals, and adjusts item COGS
   * based on return condition (CHANGE_OF_MIND vs. DEFECTIVE).
   *
   * @param query InventoryVelocityQueryDto
   * @returns InventoryVelocityResponseDto
   */
  async getInventoryVelocity(
    query: InventoryVelocityQueryDto,
  ): Promise<InventoryVelocityResponseDto> {
    const {
      startDate,
      endDate,
      agingDays = 30,
      maxSalesThreshold = 0,
      sortBy = FastMovingSortBy.QUANTITY,
      limit = 10,
    } = query;

    if (startDate && endDate && startDate > endDate) {
      this.logger.warn(
        `Invalid date range in getInventoryVelocity: startDate=${startDate.toISOString()} > endDate=${endDate.toISOString()}`,
      );
      throw new InvalidDateRangeException();
    }

    this.logger.log(
      `Fetching inventory velocity report: startDate=${startDate?.toISOString() ?? 'ALL'}, endDate=${endDate?.toISOString() ?? 'ALL'}, agingDays=${agingDays}, sortBy=${sortBy}, limit=${limit}`,
    );

    // Common Date Filter for Fast-Moving query
    const fastDateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) fastDateFilter.gte = startDate;
    if (endDate) fastDateFilter.lte = endDate;

    const hasFastDateFilter = Object.keys(fastDateFilter).length > 0;

    // Include COMPLETED and PARTIALLY_REFUNDED transactions
    const validStatuses = [
      TransactionStatus.COMPLETED,
      TransactionStatus.PARTIALLY_REFUNDED,
    ];

    const fastTransactionWhere = {
      status: { in: validStatuses },
      ...(hasFastDateFilter && { date: fastDateFilter }),
    };

    const fastReturnWhere = {
      ...(hasFastDateFilter && { date: fastDateFilter }),
      transaction: {
        status: { in: validStatuses },
      },
    };

    // Cutoff date for Slow-Moving / Dead Stock aging calculation
    const now = new Date();
    const agingCutoffDate = new Date(
      now.getTime() - agingDays * 24 * 60 * 60 * 1000,
    );

    // Parallel DB Execution
    const [fastTransactionItems, fastReturns, activeProducts] =
      await Promise.all([
        // 1. Fetch TransactionItems for Fast-Moving analytics (using historical cost_price snapshot)
        this.prisma.transactionItem.findMany({
          where: {
            transaction: fastTransactionWhere,
          },
          select: {
            transactionId: true,
            productId: true,
            base_quantity_deducted: true,
            subtotal: true,
            cost_price: true,
          },
        }),

        // 2. Fetch Returns within the Fast-Moving date window
        this.prisma.return.findMany({
          where: fastReturnWhere,
          select: {
            transactionId: true,
            productId: true,
            quantity: true,
            refund_amount: true,
            condition: true,
            transaction: {
              select: {
                transactionItems: {
                  select: {
                    productId: true,
                    cost_price: true,
                  },
                },
              },
            },
          },
        }),

        // 3. Fetch Active Products with current stock > 0 for Slow-Moving analytics
        this.prisma.product.findMany({
          where: {
            current_quantity: { gt: 0 },
          },
          include: {
            category: { select: { name: true } },
            bin_location: true,
            transactionItems: {
              where: {
                transaction: {
                  status: { in: validStatuses },
                  date: { gte: agingCutoffDate },
                },
              },
              select: {
                base_quantity_deducted: true,
              },
            },
            returns: {
              where: {
                date: { gte: agingCutoffDate },
              },
              select: {
                quantity: true,
              },
            },
            stockMovements: {
              where: {
                type: { in: [MovementType.OUT, MovementType.SALE] },
              },
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true },
            },
          },
        }),
      ]);

    // Aggregate Fast-Moving Sales & Historical COGS per Product
    const productStatsMap = new Map<
      number,
      {
        grossQty: number;
        grossRevenue: number;
        grossCogs: number;
        returnedQty: number;
        refundAmount: number;
        recoveredCogs: number;
        transactionIds: Set<number>;
      }
    >();

    const getOrCreateStats = (productId: number) => {
      if (!productStatsMap.has(productId)) {
        productStatsMap.set(productId, {
          grossQty: 0,
          grossRevenue: 0,
          grossCogs: 0,
          returnedQty: 0,
          refundAmount: 0,
          recoveredCogs: 0,
          transactionIds: new Set<number>(),
        });
      }
      return productStatsMap.get(productId)!;
    };

    for (const item of fastTransactionItems) {
      const stats = getOrCreateStats(item.productId);
      const qty = Number(item.base_quantity_deducted);
      const rev = Number(item.subtotal);
      const itemCogs = qty * Number(item.cost_price);

      stats.grossQty += qty;
      stats.grossRevenue += rev;
      stats.grossCogs += itemCogs;
      stats.transactionIds.add(item.transactionId);
    }

    // Fetch product master details for all products with activity
    const fastProductIds = Array.from(productStatsMap.keys());
    const fastProducts = await this.prisma.product.findMany({
      where: { id: { in: fastProductIds } },
      include: { category: { select: { name: true } } },
    });
    const fastProductMap = new Map(fastProducts.map((p) => [p.id, p]));

    // Deduct Returns from Fast-Moving Metrics
    for (const ret of fastReturns) {
      const stats = productStatsMap.get(ret.productId);
      if (!stats) continue;

      const retQty = Number(ret.quantity);
      const refAmt = Number(ret.refund_amount);

      stats.returnedQty += retQty;
      stats.refundAmount += refAmt;

      // Only CHANGE_OF_MIND returns recover COGS; DEFECTIVE returns remain a loss
      if (ret.condition === ItemCondition.CHANGE_OF_MIND) {
        const matchedLineItem = ret.transaction.transactionItems.find(
          (ti) => ti.productId === ret.productId,
        );
        const fallbackCost = fastProductMap.get(ret.productId)?.cost_price ?? 0;
        const unitCost = matchedLineItem
          ? Number(matchedLineItem.cost_price)
          : Number(fallbackCost);

        stats.recoveredCogs += retQty * unitCost;
      }
    }

    // Format Fast-Moving Items List
    let fast_moving_items: FastMovingItemDto[] = Array.from(
      productStatsMap.entries(),
    )
      .map(([productId, stats]) => {
        const product = fastProductMap.get(productId);
        if (!product) return null;

        const netQtySold = Math.max(0, stats.grossQty - stats.returnedQty);
        if (netQtySold <= 0) return null;

        const netRevenue = Math.max(0, stats.grossRevenue - stats.refundAmount);
        const netCogs = Math.max(0, stats.grossCogs - stats.recoveredCogs);
        const grossProfit = netRevenue - netCogs;

        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category_name: product.category.name,
          base_uom: product.base_uom,
          current_quantity: Number(product.current_quantity),
          total_base_quantity_sold: Number(netQtySold.toFixed(3)),
          total_revenue: Number(netRevenue.toFixed(2)),
          total_gross_profit: Number(grossProfit.toFixed(2)),
          transaction_count: stats.transactionIds.size,
        };
      })
      .filter((item): item is FastMovingItemDto => item !== null);

    // Sort Fast-Moving Items based on user preference
    fast_moving_items.sort((a, b) => {
      if (sortBy === FastMovingSortBy.REVENUE) {
        return b.total_revenue - a.total_revenue;
      }
      return b.total_base_quantity_sold - a.total_base_quantity_sold;
    });

    fast_moving_items = fast_moving_items.slice(0, limit);

    // Format Slow-Moving Items List
    const slow_moving_items: SlowMovingItemDto[] = [];

    for (const prod of activeProducts) {
      // Sum gross sales volume minus returned volume during aging period
      const grossAgingSales = prod.transactionItems.reduce(
        (sum, item) => sum + Number(item.base_quantity_deducted),
        0,
      );
      const returnedAgingVolume = prod.returns.reduce(
        (sum, ret) => sum + Number(ret.quantity),
        0,
      );
      const agingSalesVolume = Math.max(
        0,
        grossAgingSales - returnedAgingVolume,
      );

      // Check if product qualifies as slow-moving based on threshold
      if (agingSalesVolume <= maxSalesThreshold) {
        const lastSaleDate =
          prod.stockMovements.length > 0
            ? prod.stockMovements[0].date
            : prod.createdAt;

        const diffTime = Math.abs(
          now.getTime() - new Date(lastSaleDate).getTime(),
        );
        const daysWithoutSales = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const currentQty = Number(prod.current_quantity);
        const costPrice = Number(prod.cost_price);
        const tiedUpCapital = currentQty * costPrice;

        const binLocStr = prod.bin_location
          ? `Aisle ${prod.bin_location.aisle_number}, Shelf ${prod.bin_location.shelf_location}`
          : 'Unassigned';

        slow_moving_items.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          category_name: prod.category.name,
          bin_location: binLocStr,
          base_uom: prod.base_uom,
          current_quantity: Number(currentQty.toFixed(3)),
          cost_price: Number(costPrice.toFixed(2)),
          tied_up_capital: Number(tiedUpCapital.toFixed(2)),
          sales_in_aging_period: Number(agingSalesVolume.toFixed(3)),
          last_sale_date: lastSaleDate,
          days_without_sales: daysWithoutSales,
        });
      }
    }

    // Sort Slow-Moving items by longest time without sales descending
    slow_moving_items.sort(
      (a, b) => b.days_without_sales - a.days_without_sales,
    );

    return {
      fast_moving_items,
      slow_moving_items: slow_moving_items.slice(0, limit),
    };
  }

  /**
   * Generates Customer Accounts Receivable (AR) & Credit Analytics Report.
   * Accounts for COMPLETED & PARTIALLY_REFUNDED wholesale transactions, deducts
   * customer return refunds from net sales volume, and excludes cancelled/fully
   * refunded transactions from active AR aging buckets.
   *
   * @param query AccountsReceivableQueryDto
   * @returns AccountsReceivableResponseDto
   */
  async getAccountsReceivableAnalytics(
    query: AccountsReceivableQueryDto,
  ): Promise<AccountsReceivableResponseDto> {
    const { limit = 10 } = query;

    this.logger.log(
      `Fetching Accounts Receivable analytics report: limit=${limit}`,
    );

    const validTransactionStatuses = [
      TransactionStatus.COMPLETED,
      TransactionStatus.PARTIALLY_REFUNDED,
    ];

    // Parallel DB Execution
    const [
      wholesaleCustomers,
      openCreditPayments,
      wholesaleSales,
      customerReturns,
    ] = await Promise.all([
      // 1. Fetch Wholesale Profiles with basic Customer contact info
      this.prisma.wholeSaleCustomer.findMany({
        include: {
          customer: {
            select: {
              name: true,
              contact_number: true,
            },
          },
          customerPayments: {
            select: {
              amount_paid: true,
            },
          },
        },
      }),

      // 2. Fetch Open/Unpaid Credit Payments tied to valid (non-cancelled/non-refunded) transactions
      this.prisma.creditPayment.findMany({
        where: {
          status: {
            in: [
              CreditStatus.UNPAID,
              CreditStatus.PARTIALLY_PAID,
              CreditStatus.OVERDUE,
            ],
          },
          remaining_credit_balance: { gt: 0 },
          payment: {
            transaction: {
              status: { in: validTransactionStatuses },
            },
          },
        },
        include: {
          payment: {
            include: {
              transaction: {
                select: {
                  customerId: true,
                },
              },
            },
          },
        },
      }),

      // 3. Fetch Gross Sales Transactions (COMPLETED & PARTIALLY_REFUNDED) grouped by Customer
      this.prisma.transaction.groupBy({
        by: ['customerId'],
        _sum: {
          grand_total: true,
        },
        where: {
          status: { in: validTransactionStatuses },
          customerId: { not: null },
        },
      }),

      // 4. Fetch Customer Returns to deduct refund amounts from wholesale sales volume
      this.prisma.return.findMany({
        where: {
          transaction: {
            customerId: { not: null },
            status: {
              in: [
                TransactionStatus.COMPLETED,
                TransactionStatus.PARTIALLY_REFUNDED,
                TransactionStatus.REFUNDED,
              ],
            },
          },
        },
        select: {
          refund_amount: true,
          transaction: {
            select: {
              customerId: true,
            },
          },
        },
      }),
    ]);

    // 1. Credit Overview Calculations
    let totalCreditExtended = 0;
    let totalOutstandingDebt = 0;

    wholesaleCustomers.forEach((wc) => {
      totalCreditExtended += Number(wc.credit_limit);
      totalOutstandingDebt += Number(wc.outstanding_balance);
    });

    const creditUtilizationPct =
      totalCreditExtended > 0
        ? (totalOutstandingDebt / totalCreditExtended) * 100
        : 0;

    const credit_overview: CreditOverviewDto = {
      total_credit_extended: Number(totalCreditExtended.toFixed(2)),
      total_outstanding_debt: Number(totalOutstandingDebt.toFixed(2)),
      credit_utilization_percentage: Number(creditUtilizationPct.toFixed(2)),
      total_wholesale_accounts: wholesaleCustomers.length,
    };

    // 2. AR Aging Table Calculations
    const now = new Date();
    const agingMap = new Map<number, ArAgingItemDto>();

    // Initialize map with all wholesale customers
    wholesaleCustomers.forEach((wc) => {
      agingMap.set(wc.customerId, {
        customerId: wc.customerId,
        company_name: wc.company_name,
        customer_name: wc.customer.name,
        contact_number: wc.customer.contact_number,
        total_outstanding_balance: Number(
          Number(wc.outstanding_balance).toFixed(2),
        ),
        current_amount: 0,
        days_1_30_overdue: 0,
        days_31_60_overdue: 0,
        days_60_plus_overdue: 0,
      });
    });

    // Process open credit payments into aging buckets
    for (const cp of openCreditPayments) {
      const custId = cp.payment.transaction?.customerId;
      if (!custId || !agingMap.has(custId)) continue;

      const customerAging = agingMap.get(custId)!;
      const balance = Number(cp.remaining_credit_balance);
      const dueDate = new Date(cp.due_date);

      if (dueDate >= now) {
        customerAging.current_amount += balance;
      } else {
        const diffDays = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays <= 30) {
          customerAging.days_1_30_overdue += balance;
        } else if (diffDays <= 60) {
          customerAging.days_31_60_overdue += balance;
        } else {
          customerAging.days_60_plus_overdue += balance;
        }
      }
    }

    // Format aging items
    const aging_table: ArAgingItemDto[] = Array.from(agingMap.values())
      .filter((item) => item.total_outstanding_balance > 0)
      .map((item) => ({
        ...item,
        current_amount: Number(item.current_amount.toFixed(2)),
        days_1_30_overdue: Number(item.days_1_30_overdue.toFixed(2)),
        days_31_60_overdue: Number(item.days_31_60_overdue.toFixed(2)),
        days_60_plus_overdue: Number(item.days_60_plus_overdue.toFixed(2)),
      }))
      .sort(
        (a, b) => b.total_outstanding_balance - a.total_outstanding_balance,
      );

    // 3. Top Credit Customers Calculation (Net of Refunds)
    const salesVolumeMap = new Map<number, number>();
    wholesaleSales.forEach((s) => {
      if (s.customerId) {
        salesVolumeMap.set(s.customerId, Number(s._sum.grand_total || 0));
      }
    });

    const refundsByCustomerMap = new Map<number, number>();
    customerReturns.forEach((ret) => {
      const custId = ret.transaction.customerId;
      if (custId) {
        const currentRefunds = refundsByCustomerMap.get(custId) || 0;
        refundsByCustomerMap.set(
          custId,
          currentRefunds + Number(ret.refund_amount),
        );
      }
    });

    const top_credit_customers: TopCreditCustomerDto[] = wholesaleCustomers
      .map((wc) => {
        const grossSalesVolume = salesVolumeMap.get(wc.customerId) || 0;
        const totalRefunds = refundsByCustomerMap.get(wc.customerId) || 0;
        const netSalesVolume = Math.max(0, grossSalesVolume - totalRefunds);

        const totalSettled = wc.customerPayments.reduce(
          (sum, p) => sum + Number(p.amount_paid),
          0,
        );
        const outstanding = Number(wc.outstanding_balance);
        const totalBilled = totalSettled + outstanding;

        // Promptness score = (Settled Debt / Total Billed Debt) * 100
        const promptnessScore =
          totalBilled > 0 ? (totalSettled / totalBilled) * 100 : 100;

        return {
          customerId: wc.customerId,
          company_name: wc.company_name,
          total_sales_volume: Number(netSalesVolume.toFixed(2)),
          total_settled_payments: Number(totalSettled.toFixed(2)),
          current_outstanding_balance: Number(outstanding.toFixed(2)),
          promptness_score: Number(promptnessScore.toFixed(2)),
        };
      })
      .sort((a, b) => b.total_sales_volume - a.total_sales_volume)
      .slice(0, limit);

    return {
      credit_overview,
      aging_table,
      top_credit_customers,
    };
  }
}
