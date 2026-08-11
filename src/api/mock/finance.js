// Invoices, payments, reports mock data — lifted verbatim from reference/orbi-portal-redesign.html (lines 907-967)
// Modeled for later use; v1 UI does not render these yet.
export const INVOICES = {
  A1: [
    { no: 'INV-2026-0612', date: 'Jun 1, 2026', desc: 'Management fee - June', amount: 120.00, status: 'overdue', due: 'Jun 25' },
    { no: 'INV-2026-0598', date: 'Jun 1, 2026', desc: 'Utilities - June', amount: 60.00, status: 'overdue', due: 'Jun 25' },
    { no: 'INV-2026-0571', date: 'May 1, 2026', desc: 'Management fee - May', amount: 120.00, status: 'paid', due: 'May 25' },
    { no: 'INV-2026-0540', date: 'Apr 1, 2026', desc: 'Management fee - April', amount: 120.00, status: 'paid', due: 'Apr 25' },
  ],
  A2: [
    { no: 'INV-2026-0613', date: 'Jun 1, 2026', desc: 'Management fee - June', amount: 95.00, status: 'pending', due: 'Jun 25' },
    { no: 'INV-2026-0572', date: 'May 1, 2026', desc: 'Management fee - May', amount: 95.00, status: 'paid', due: 'May 25' },
  ],
  A3: [
    { no: 'INV-2026-0620', date: 'Jun 1, 2026', desc: 'Management fee - June', amount: 95.00, status: 'overdue', due: 'Jun 25' },
    { no: 'INV-2026-0581', date: 'May 1, 2026', desc: 'Management fee - May', amount: 95.00, status: 'paid', due: 'May 25' },
  ],
  A4: [
    { no: 'INV-2026-0410', date: 'Mar 1, 2026', desc: 'Management fee - March', amount: 140.00, status: 'paid', due: 'Mar 25' },
  ],
  A5: [
    { no: 'INV-2026-0615', date: 'Jun 1, 2026', desc: 'Management fee - June', amount: 90.00, status: 'paid', due: 'Jun 25' },
    { no: 'INV-2026-0575', date: 'May 1, 2026', desc: 'Management fee - May', amount: 90.00, status: 'paid', due: 'May 25' },
  ],
}

export const PAYMENTS = {
  A1: [
    { date: 'May 22, 2026', method: 'Visa ••4821', ref: 'PAY-9921', amount: 120.00, status: 'paid' },
    { date: 'Apr 20, 2026', method: 'Bank transfer', ref: 'PAY-9740', amount: 120.00, status: 'paid' },
    { date: 'Mar 19, 2026', method: 'Visa ••4821', ref: 'PAY-9610', amount: 180.00, status: 'paid' },
  ],
  A2: [
    { date: 'May 18, 2026', method: 'Mastercard ••2207', ref: 'PAY-9905', amount: 95.00, status: 'paid' },
  ],
  A3: [
    { date: 'May 20, 2026', method: 'Bank transfer', ref: 'PAY-9912', amount: 95.00, status: 'paid' },
  ],
  A4: [
    { date: 'Mar 18, 2026', method: 'Visa ••4821', ref: 'PAY-9608', amount: 140.00, status: 'paid' },
  ],
  A5: [
    { date: 'Jun 2, 2026', method: 'Mastercard ••2207', ref: 'PAY-9930', amount: 90.00, status: 'paid' },
    { date: 'May 2, 2026', method: 'Mastercard ••2207', ref: 'PAY-9901', amount: 90.00, status: 'paid' },
  ],
}

export const REPORTS = {
  A1: [
    { name: 'Q2 2026 Income & Expense Statement', period: 'Apr–Jun 2026', size: '248 KB' },
    { name: 'Q1 2026 Income & Expense Statement', period: 'Jan–Mar 2026', size: '241 KB' },
    { name: '2025 Annual Owner Statement', period: 'Jan–Dec 2025', size: '612 KB' },
  ],
  A2: [
    { name: 'Q2 2026 Income & Expense Statement', period: 'Apr–Jun 2026', size: '201 KB' },
  ],
  A3: [
    { name: 'Q2 2026 Income & Expense Statement', period: 'Apr–Jun 2026', size: '232 KB' },
    { name: 'Q1 2026 Income & Expense Statement', period: 'Jan–Mar 2026', size: '228 KB' },
  ],
  A4: [],
  A5: [
    { name: 'Q2 2026 Income & Expense Statement', period: 'Apr–Jun 2026', size: '205 KB' },
  ],
}
