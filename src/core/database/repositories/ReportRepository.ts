import { db } from '../db';

export interface ReportSummary {
  income: number;
  newDebt: number;
}

export class ReportRepository {
  static getSummary(storeId: string, startDate: string, endDate: string): ReportSummary {
    if (!storeId) return { income: 0, newDebt: 0 };

    const incomeResult = db.getFirstSync<{ total_income: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total_income FROM payments 
       WHERE store_id = ? AND deleted_at IS NULL AND payment_date >= ? AND payment_date <= ?`,
      [storeId, startDate, endDate]
    );

    const startDateTime = `${startDate}T00:00:00.000Z`;
    const endDateTime = `${endDate}T23:59:59.999Z`;

    const newDebtResult = db.getFirstSync<{ total_new_debt: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total_new_debt FROM debts 
       WHERE store_id = ? AND deleted_at IS NULL AND created_at >= ? AND created_at <= ?`,
      [storeId, startDateTime, endDateTime]
    );

    return {
      income: incomeResult?.total_income || 0,
      newDebt: newDebtResult?.total_new_debt || 0,
    };
  }

  static getDetailedReport(storeId: string, startDate: string, endDate: string) {
    if (!storeId) return null;

    const summary = this.getSummary(storeId, startDate, endDate);
    const startDateTime = `${startDate}T00:00:00.000Z`;
    const endDateTime = `${endDate}T23:59:59.999Z`;
    const today = new Date().toISOString().substring(0, 10);

    // ─── DEBTS (الديون العادية) ──────────────────────────────────
    const debtStats = db.getFirstSync<{
      total_debts: number;
      active_debts: number;
      paid_debts: number;
      overdue_debts: number;
      total_debt_amount: number;
      total_remaining: number;
      total_collected: number;
    }>(
      `SELECT
         COUNT(*) as total_debts,
         SUM(CASE WHEN remaining_amount > 0 THEN 1 ELSE 0 END) as active_debts,
         SUM(CASE WHEN remaining_amount = 0 OR status = 'paid' THEN 1 ELSE 0 END) as paid_debts,
         SUM(CASE WHEN remaining_amount > 0 AND (status = 'overdue' OR (due_date IS NOT NULL AND due_date < ?)) THEN 1 ELSE 0 END) as overdue_debts,
         COALESCE(SUM(total_amount), 0) as total_debt_amount,
         COALESCE(SUM(remaining_amount), 0) as total_remaining,
         COALESCE(SUM(paid_amount), 0) as total_collected
       FROM debts
       WHERE store_id = ? AND deleted_at IS NULL AND (type = 'debt' OR type IS NULL OR type = '')`,
      [today, storeId]
    );

    // New regular debts created in period
    const newDebtsInPeriod = db.getFirstSync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount FROM debts
       WHERE store_id = ? AND deleted_at IS NULL AND (type = 'debt' OR type IS NULL OR type = '')
       AND created_at >= ? AND created_at <= ?`,
      [storeId, startDateTime, endDateTime]
    );

    // Debt collections (payments for regular debts) in period
    const debtPaymentsInPeriod = db.getFirstSync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(p.amount), 0) as amount
       FROM payments p
       INNER JOIN debts d ON p.debt_id = d.id
       WHERE p.store_id = ? AND p.deleted_at IS NULL AND d.deleted_at IS NULL
         AND (d.type = 'debt' OR d.type IS NULL OR d.type = '')
         AND p.payment_date >= ? AND p.payment_date <= ?`,
      [storeId, startDate, endDate]
    );

    // ─── INSTALLMENTS (الأقساط) ──────────────────────────────────
    const installmentStats = db.getFirstSync<{
      total_installments: number;
      active_installments: number;
      paid_installments: number;
      overdue_installments: number;
      total_amount: number;
      total_remaining: number;
      total_collected: number;
    }>(
      `SELECT
         COUNT(*) as total_installments,
         SUM(CASE WHEN remaining_amount > 0 THEN 1 ELSE 0 END) as active_installments,
         SUM(CASE WHEN remaining_amount = 0 OR status = 'paid' THEN 1 ELSE 0 END) as paid_installments,
         SUM(CASE WHEN remaining_amount > 0 AND (status = 'overdue' OR (due_date IS NOT NULL AND due_date < ?)) THEN 1 ELSE 0 END) as overdue_installments,
         COALESCE(SUM(total_amount), 0) as total_amount,
         COALESCE(SUM(remaining_amount), 0) as total_remaining,
         COALESCE(SUM(paid_amount), 0) as total_collected
       FROM debts
       WHERE store_id = ? AND deleted_at IS NULL AND type = 'installment'`,
      [today, storeId]
    );

    // New installments added in period
    const newInstallmentsInPeriod = db.getFirstSync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount FROM debts
       WHERE store_id = ? AND deleted_at IS NULL AND type = 'installment'
       AND created_at >= ? AND created_at <= ?`,
      [storeId, startDateTime, endDateTime]
    );

    // Installment collections (payments for installments) in period
    const installmentPaymentsInPeriod = db.getFirstSync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(p.amount), 0) as amount
       FROM payments p
       INNER JOIN debts d ON p.debt_id = d.id
       WHERE p.store_id = ? AND p.deleted_at IS NULL AND d.deleted_at IS NULL
         AND d.type = 'installment'
         AND p.payment_date >= ? AND p.payment_date <= ?`,
      [storeId, startDate, endDate]
    );

    // Installments due in period
    const installmentsDueInPeriod = db.getFirstSync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(remaining_amount), 0) as amount
       FROM debts
       WHERE store_id = ? AND deleted_at IS NULL AND type = 'installment'
         AND remaining_amount > 0
         AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?`,
      [storeId, startDate, endDate]
    );

    // ─── TOTAL PAYMENTS (الدفعات الكلية في الفترة) ─────────────
    const paymentStats = db.getFirstSync<{
      total_payments: number;
      total_payment_amount: number;
    }>(
      `SELECT COUNT(*) as total_payments, COALESCE(SUM(amount), 0) as total_payment_amount
       FROM payments
       WHERE store_id = ? AND deleted_at IS NULL AND payment_date >= ? AND payment_date <= ?`,
      [storeId, startDate, endDate]
    );

    // Active customers (customers with positive remaining debt or installment)
    const activeCustomersResult = db.getFirstSync<{ active_customers: number }>(
      `SELECT COUNT(DISTINCT customer_id) as active_customers FROM debts 
       WHERE store_id = ? AND deleted_at IS NULL AND remaining_amount > 0`,
      [storeId]
    );

    // All active customers count total
    const totalCustomersResult = db.getFirstSync<{ total_customers: number }>(
      `SELECT COUNT(*) as total_customers FROM customers 
       WHERE store_id = ? AND deleted_at IS NULL`,
      [storeId]
    );

    // Total remaining in market overall (debts + installments)
    const totalRemainingOverall = (debtStats?.total_remaining || 0) + (installmentStats?.total_remaining || 0);

    // Recent payments in period with customer name and debt title
    const recentPayments = db.getAllSync(
      `SELECT p.*, c.name as customerName, c.phone as customerPhone, d.title as debtTitle, d.type as debtType
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN debts d ON p.debt_id = d.id
       WHERE p.store_id = ? AND p.deleted_at IS NULL AND p.payment_date >= ? AND p.payment_date <= ?
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [storeId, startDate, endDate]
    );

    return {
      // Period summary
      income: summary.income,
      newDebt: summary.newDebt,
      totalRemainingOverall,
      activeCustomers: activeCustomersResult?.active_customers || 0,
      totalCustomers: totalCustomersResult?.total_customers || 0,

      // Debts (الديون)
      debtStats: {
        total: debtStats?.total_debts || 0,
        active: debtStats?.active_debts || 0,
        paid: debtStats?.paid_debts || 0,
        overdue: debtStats?.overdue_debts || 0,
        totalAmount: debtStats?.total_debt_amount || 0,
        totalRemaining: debtStats?.total_remaining || 0,
        totalCollected: debtStats?.total_collected || 0,
        newInPeriod: newDebtsInPeriod?.count || 0,
        newAmountInPeriod: newDebtsInPeriod?.amount || 0,
        collectedInPeriod: debtPaymentsInPeriod?.amount || 0,
        paymentsCountInPeriod: debtPaymentsInPeriod?.count || 0,
      },

      // Installments (الأقساط)
      installmentStats: {
        total: installmentStats?.total_installments || 0,
        active: installmentStats?.active_installments || 0,
        paid: installmentStats?.paid_installments || 0,
        overdue: installmentStats?.overdue_installments || 0,
        totalAmount: installmentStats?.total_amount || 0,
        totalRemaining: installmentStats?.total_remaining || 0,
        totalCollected: installmentStats?.total_collected || 0,
        newInPeriod: newInstallmentsInPeriod?.count || 0,
        newAmountInPeriod: newInstallmentsInPeriod?.amount || 0,
        collectedInPeriod: installmentPaymentsInPeriod?.amount || 0,
        paymentsCountInPeriod: installmentPaymentsInPeriod?.count || 0,
        dueInPeriod: installmentsDueInPeriod?.count || 0,
        dueAmountInPeriod: installmentsDueInPeriod?.amount || 0,
      },

      // Payments summary in period
      paymentStats: {
        count: paymentStats?.total_payments || 0,
        totalAmount: paymentStats?.total_payment_amount || 0,
        debtPaymentsCount: debtPaymentsInPeriod?.count || 0,
        debtPaymentsAmount: debtPaymentsInPeriod?.amount || 0,
        installmentPaymentsCount: installmentPaymentsInPeriod?.count || 0,
        installmentPaymentsAmount: installmentPaymentsInPeriod?.amount || 0,
      },

      recentPayments,
    };
  }
}

