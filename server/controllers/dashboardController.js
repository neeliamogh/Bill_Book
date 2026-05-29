// Dashboard stats controller for generating analytical insights
const db = require('../db/db');

const getDashboardStats = async (req, res) => {
  try {
    // 1. Total revenue (sum of paid invoices)
    const revQuery = await db.query("SELECT COALESCE(SUM(total), 0) as total_revenue FROM invoices WHERE status = 'paid'");
    const total_revenue = parseFloat(revQuery.rows[0].total_revenue);

    // 2. Outstanding amount (sum of sent + overdue invoices)
    const outQuery = await db.query("SELECT COALESCE(SUM(total), 0) as outstanding_amount FROM invoices WHERE status IN ('sent', 'overdue')");
    const outstanding_amount = parseFloat(outQuery.rows[0].outstanding_amount);

    // 3. Invoice counts and breakdowns
    const countQuery = await db.query(`
      SELECT 
        COUNT(*)::integer as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::integer as paid_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)::integer as overdue_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::integer as draft_count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END)::integer as sent_count
      FROM invoices
    `);
    const { total_invoices, paid_count, overdue_count, draft_count, sent_count } = countQuery.rows[0];

    // 4. Tax collected (sum of tax_amount on paid invoices)
    const taxQuery = await db.query("SELECT COALESCE(SUM(tax_amount), 0) as tax_collected FROM invoices WHERE status = 'paid'");
    const tax_collected = parseFloat(taxQuery.rows[0].tax_collected);

    // 5. Total discounts (sum of discount_amount on all invoices)
    const discQuery = await db.query("SELECT COALESCE(SUM(discount_amount), 0) as total_discounts FROM invoices");
    const total_discounts = parseFloat(discQuery.rows[0].total_discounts);

    // Profit loss = revenue minus expenses (use total_revenue for now)
    const profit_loss = total_revenue;

    // 6. Status breakdown data (for PieChart)
    const status_breakdown = [
      { name: 'Paid', value: paid_count },
      { name: 'Sent', value: sent_count },
      { name: 'Overdue', value: overdue_count },
      { name: 'Draft', value: draft_count }
    ];

    // 7. Monthly revenue breakdown for the last 6 months (for BarChart)
    const monthsList = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      // Set date to first day of target month to avoid day-overflow bugs
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const name = d.toLocaleString('default', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      
      monthsList.push({
        label: `${name} '${year}`,
        monthVal: d.getMonth() + 1,
        yearVal: d.getFullYear(),
        revenue: 0
      });
    }

    const monthlyQuery = `
      SELECT 
        EXTRACT(MONTH FROM issue_date)::integer as month_val,
        EXTRACT(YEAR FROM issue_date)::integer as year_val,
        SUM(total) as revenue
      FROM invoices
      WHERE status = 'paid'
        AND issue_date >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
      GROUP BY year_val, month_val
    `;
    const monthlyResult = await db.query(monthlyQuery);

    monthlyResult.rows.forEach(row => {
      const monthItem = monthsList.find(m => m.monthVal === row.month_val && m.yearVal === row.year_val);
      if (monthItem) {
        monthItem.revenue = parseFloat(row.revenue);
      }
    });

    const revenue_by_month = monthsList.map(m => ({
      month: m.label,
      revenue: m.revenue
    }));

    return res.json({
      total_revenue,
      outstanding_amount,
      total_invoices,
      paid_count,
      overdue_count,
      draft_count,
      sent_count,
      revenue_by_month,
      status_breakdown,
      tax_collected,
      total_discounts,
      profit_loss
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getDashboardStats };
