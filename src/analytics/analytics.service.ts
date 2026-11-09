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
  MovementType,
  TransactionStatus,
} from 'src/generated/prisma/enums';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates real-time high-level KPI metrics for the executive dashboard.
   * Computes Revenue, COGS, Gross Profit, OpEx, Net Profit, and Active AR.
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

    // Build common date filter clause for transactions and expenses
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const transactionWhere = {
      status: TransactionStatus.COMPLETED,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    const expenseWhere = {
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    // Execute queries concurrently for high performance
    const [revenueAggregate, transactionItems, expenseAggregate, arAggregate] =
      await Promise.all([
        // 1. Total Sales Revenue
        this.prisma.transaction.aggregate({
          _sum: { grand_total: true },
          where: transactionWhere,
        }),

        // 2. Fetch Transaction Items to calculate Cost of Goods Sold (COGS)
        this.prisma.transactionItem.findMany({
          where: {
            transaction: transactionWhere,
          },
          select: {
            base_quantity_deducted: true,
            cost_price: true,
          },
        }),

        // 3. Total OpEx (General Expenses)
        this.prisma.expense.aggregate({
          _sum: { amount: true },
          where: expenseWhere,
        }),

        // 4. Total Active Accounts Receivable (Current outstanding balance across all wholesale profiles)
        this.prisma.wholeSaleCustomer.aggregate({
          _sum: { outstanding_balance: true },
        }),
      ]);

    // Parse aggregated values securely (Fallback to 0 if null)
    const totalRevenue = revenueAggregate._sum.grand_total
      ? Number(revenueAggregate._sum.grand_total)
      : 0;

    const totalOpEx = expenseAggregate._sum.amount
      ? Number(expenseAggregate._sum.amount)
      : 0;

    const totalActiveReceivables = arAggregate._sum.outstanding_balance
      ? Number(arAggregate._sum.outstanding_balance)
      : 0;

    // Calculate COGS: Sum of (base_quantity_deducted * cost_price) for each item
    const totalCogs = transactionItems.reduce((acc, item) => {
      const itemCogs =
        Number(item.base_quantity_deducted) * Number(item.cost_price);
      return acc + itemCogs;
    }, 0);

    // Profit and Margin Calculations
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercentage =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 10 : 0;

    const netProfit = grossProfit - totalOpEx;
    const netMarginPercentage =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    this.logger.log(
      `Dashboard summary computed successfully: Revenue=${totalRevenue}, COGS=${totalCogs}, GrossProfit=${grossProfit}, OpEx=${totalOpEx}, NetProfit=${netProfit}, AR=${totalActiveReceivables}`,
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

    const transactionWhere = {
      status: TransactionStatus.COMPLETED,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    const expenseWhere = {
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    // Parallel Database Execution
    const [transactions, expenses, payments] = await Promise.all([
      // 1. Fetch Completed Transactions with items
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

      // 2. Fetch Expenses for interval Net Profit calculation
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: {
          date: true,
          amount: true,
        },
      }),

      // 3. Fetch Payments associated with completed transactions
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

    let totalRevenue = 0;
    let totalDiscounts = 0;
    let totalCogs = 0;

    for (const tx of transactions) {
      const label = getPeriodLabel(tx.date);
      const rev = Number(tx.grand_total);
      const disc = Number(tx.discount_total);

      const txCogs = tx.transactionItems.reduce((acc, item) => {
        return (
          acc + Number(item.base_quantity_deducted) * Number(item.cost_price)
        );
      }, 0);

      totalRevenue += rev;
      totalDiscounts += disc;
      totalCogs += txCogs;

      const current = trendMap.get(label) || { revenue: 0, cogs: 0, opex: 0 };
      trendMap.set(label, {
        revenue: current.revenue + rev,
        cogs: current.cogs + txCogs,
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
      .map(([date_label, data]) => ({
        date_label,
        revenue: Number(data.revenue.toFixed(2)),
        net_profit: Number((data.revenue - data.cogs - data.opex).toFixed(2)),
      }));

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

    // Summary Ledger Calculation
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPct =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const summary_ledger: SummaryLedgerDto = {
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_discounts: Number(totalDiscounts.toFixed(2)),
      total_cogs: Number(totalCogs.toFixed(2)),
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
          orderBy: { date: 'desc' },
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

    // Format Category Breakdown with percentage share
    const category_breakdown: CategoryBreakdownItemDto[] = categoryGroups.map(
      (group) => {
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
      },
    );

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

    const fastTransactionWhere = {
      status: TransactionStatus.COMPLETED,
      ...(Object.keys(fastDateFilter).length > 0 && { date: fastDateFilter }),
    };

    // Cutoff date for Slow-Moving / Dead Stock aging calculation
    const now = new Date();
    const agingCutoffDate = new Date(
      now.getTime() - agingDays * 24 * 60 * 60 * 1000,
    );

    // Parallel DB Execution
    const [fastMovingGroups, activeProducts] = await Promise.all([
      // 1. Group TransactionItems by Product for Fast-Moving analytics
      this.prisma.transactionItem.groupBy({
        by: ['productId'],
        _sum: {
          base_quantity_deducted: true,
          subtotal: true,
        },
        _count: {
          transactionId: true,
        },
        where: {
          transaction: fastTransactionWhere,
        },
      }),

      // 2. Fetch Active Products with current stock > 0 for Slow-Moving analytics
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
                status: TransactionStatus.COMPLETED,
                date: { gte: agingCutoffDate },
              },
            },
            select: {
              base_quantity_deducted: true,
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

    // Fetch Details for Fast Moving Products
    const fastProductIds = fastMovingGroups.map((g) => g.productId);
    const fastProducts = await this.prisma.product.findMany({
      where: { id: { in: fastProductIds } },
      include: { category: { select: { name: true } } },
    });

    const fastProductMap = new Map(fastProducts.map((p) => [p.id, p]));

    // Format Fast-Moving Items List
    let fast_moving_items: FastMovingItemDto[] = fastMovingGroups
      .map((group) => {
        const product = fastProductMap.get(group.productId);
        if (!product) return null;

        const totalQty = group._sum.base_quantity_deducted
          ? Number(group._sum.base_quantity_deducted)
          : 0;
        const totalRevenue = group._sum.subtotal
          ? Number(group._sum.subtotal)
          : 0;
        const totalCogs = totalQty * Number(product.cost_price);
        const grossProfit = totalRevenue - totalCogs;

        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category_name: product.category.name,
          base_uom: product.base_uom,
          current_quantity: Number(product.current_quantity),
          total_base_quantity_sold: Number(totalQty.toFixed(3)),
          total_revenue: Number(totalRevenue.toFixed(2)),
          total_gross_profit: Number(grossProfit.toFixed(2)),
          transaction_count: group._count.transactionId,
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
      // Sum sales volume during aging period
      const agingSalesVolume = prod.transactionItems.reduce(
        (sum, item) => sum + Number(item.base_quantity_deducted),
        0,
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

    // Parallel DB Execution
    const [wholesaleCustomers, openCreditPayments, wholesaleSales] =
      await Promise.all([
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

        // 2. Fetch Open/Unpaid Credit Payments with Transaction & Customer relations
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

        // 3. Fetch Completed Sales Transactions grouped by Wholesale Customer
        this.prisma.transaction.groupBy({
          by: ['customerId'],
          _sum: {
            grand_total: true,
          },
          where: {
            status: TransactionStatus.COMPLETED,
            customerId: { not: null },
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

    // 3. Top Credit Customers Calculation
    const salesVolumeMap = new Map<number, number>();
    wholesaleSales.forEach((s) => {
      if (s.customerId) {
        salesVolumeMap.set(s.customerId, Number(s._sum.grand_total || 0));
      }
    });

    const top_credit_customers: TopCreditCustomerDto[] = wholesaleCustomers
      .map((wc) => {
        const salesVolume = salesVolumeMap.get(wc.customerId) || 0;
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
          total_sales_volume: Number(salesVolume.toFixed(2)),
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
