import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type GLAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface CreateAccountInput {
  code: string;
  name: string;
  type: string;
  subtype?: string;
  parentAccountId?: string;
  openingBalance?: number;
  currency?: string;
}

export interface UpdateAccountInput {
  code?: string;
  name?: string;
  type?: string;
  subtype?: string;
  parentAccountId?: string | null;
  isActive?: boolean;
  openingBalance?: number;
  currency?: string;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  date?: Date;
  description?: string;
  reference?: string;
  lines: JournalLineInput[];
}

export interface ListAccountsOpts {
  type?: string;
  isActive?: boolean;
}

export interface ListJournalEntriesOpts {
  status?: string;
  period?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface TrialBalanceOpts {
  asOfDate?: Date;
}

export interface FinancialStatementsOpts {
  fromDate?: Date;
  toDate?: Date;
  period?: string;
}

export interface GeneralLedgerOpts {
  accountId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface TrialBalanceLine {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  lines: TrialBalanceLine[];
  totalDebits: number;
  totalCredits: number;
}

export interface BalanceSheet {
  assets: TrialBalanceLine[];
  liabilities: TrialBalanceLine[];
  equity: TrialBalanceLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface IncomeStatement {
  revenue: TrialBalanceLine[];
  expenses: TrialBalanceLine[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface CashFlowSummary {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
}

export interface FinancialStatements {
  balanceSheet: BalanceSheet;
  incomeStatement: IncomeStatement;
  cashFlowSummary: CashFlowSummary;
}

export interface GeneralLedgerLine {
  journalEntryId: string;
  entryNumber: string;
  date: Date;
  description: string;
  reference: string;
  status: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineDescription: string;
}

export interface AccountingStats {
  accountCount: number;
  activeAccountCount: number;
  journalEntryCount: number;
  postedEntryCount: number;
  draftEntryCount: number;
  totalDebits: number;
  totalCredits: number;
  closedPeriods: number;
}

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function periodFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface GLAccountRow {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  parentAccountId: string | null;
  isActive: boolean;
  openingBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JournalEntryRow {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  entryNumber: string;
  date: Date;
  description: string;
  reference: string;
  status: string;
  period: string;
  isReversed: boolean;
  reversedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines?: JournalLineRow[];
}

interface JournalLineRow {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string;
  createdAt: Date;
  account?: GLAccountRow;
}

interface MemoryRow {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: string;
  content: string;
  createdAt: Date;
}

// ── Accounting Service ──

export const AccountingService = {
  /**
   * Create a GL account — validates unique code within the organization.
   */
  async createAccount(organizationId: string, input: CreateAccountInput) {
    const existing = await safePrisma(() =>
      prisma.gLAccount.findUnique({
        where: { organizationId_code: { organizationId, code: input.code } },
      }),
      null,
    );
    if (existing) {
      throw new Error('account_code_already_exists');
    }
    return prisma.gLAccount.create({
      data: {
        organizationId,
        code: input.code,
        name: input.name,
        type: input.type,
        subtype: input.subtype ?? '',
        parentAccountId: input.parentAccountId ?? null,
        openingBalance: input.openingBalance ?? 0,
        currency: input.currency ?? 'USD',
      },
    });
  },

  /**
   * Get a single GL account by id.
   */
  async getAccount(id: string) {
    return safePrisma(() => prisma.gLAccount.findUnique({ where: { id } }), null);
  },

  /**
   * List GL accounts with optional filters.
   */
  async listAccounts(organizationId: string, opts?: ListAccountsOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.type) where.type = opts.type;
    if (typeof opts?.isActive === 'boolean') where.isActive = opts.isActive;
    return safePrisma(() =>
      prisma.gLAccount.findMany({
        where,
        orderBy: { code: 'asc' },
      }),
      [],
    );
  },

  /**
   * Update a GL account.
   */
  async updateAccount(id: string, input: UpdateAccountInput) {
    const data: Record<string, unknown> = {};
    if (input.code !== undefined) data.code = input.code;
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.subtype !== undefined) data.subtype = input.subtype;
    if (input.parentAccountId !== undefined) data.parentAccountId = input.parentAccountId;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.openingBalance !== undefined) data.openingBalance = input.openingBalance;
    if (input.currency !== undefined) data.currency = input.currency;
    return prisma.gLAccount.update({ where: { id }, data });
  },

  /**
   * Delete a GL account — only allowed when no journal lines reference it.
   */
  async deleteAccount(id: string) {
    const lineCount = await safePrisma(() =>
      prisma.journalLine.count({ where: { accountId: id } }),
      0,
    );
    if (lineCount > 0) {
      throw new Error('account_has_journal_lines');
    }
    return prisma.gLAccount.delete({ where: { id } });
  },

  /**
   * Get the balance of an account (sum of debits and credits from journal lines).
   */
  async getAccountBalance(organizationId: string, accountId: string): Promise<AccountBalance> {
    const account = await safePrisma(() =>
      prisma.gLAccount.findUnique({ where: { id: accountId } }),
      null,
    );
    if (!account) {
      throw new Error('account_not_found');
    }
    const lines = await safePrisma(() =>
      prisma.journalLine.findMany({
        where: { accountId, journalEntry: { organizationId, status: 'posted' } },
        select: { debit: true, credit: true },
      }),
      [],
    );
    const row = account as GLAccountRow;
    const debitTotal = round2(
      (lines as Array<{ debit: number; credit: number }>).reduce((s, l) => s + l.debit, 0),
    );
    const creditTotal = round2(
      (lines as Array<{ debit: number; credit: number }>).reduce((s, l) => s + l.credit, 0),
    );
    // For asset/expense accounts, debits increase the balance.
    // For liability/equity/revenue accounts, credits increase the balance.
    const isDebitNormal = row.type === 'asset' || row.type === 'expense';
    const balance = round2(
      row.openingBalance + (isDebitNormal ? debitTotal - creditTotal : creditTotal - debitTotal),
    );
    return {
      accountId: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      debitTotal,
      creditTotal,
      balance,
    };
  },

  /**
   * Get the chart of accounts — all accounts with their balances.
   */
  async getChartOfAccounts(organizationId: string): Promise<AccountBalance[]> {
    const accounts = await safePrisma(() =>
      prisma.gLAccount.findMany({
        where: { organizationId },
        orderBy: { code: 'asc' },
      }),
      [],
    );
    const result: AccountBalance[] = [];
    for (const a of accounts as GLAccountRow[]) {
      const balance = await AccountingService.getAccountBalance(organizationId, a.id);
      result.push(balance);
    }
    return result;
  },

  /**
   * Create a journal entry — auto-generates entry number, validates debits=credits.
   */
  async createJournalEntry(
    organizationId: string,
    workspaceId: string | null,
    input: CreateJournalEntryInput,
    createdBy: string,
  ) {
    // Validate balanced entry
    const totalDebit = round2(input.lines.reduce((s, l) => s + (l.debit || 0), 0));
    const totalCredit = round2(input.lines.reduce((s, l) => s + (l.credit || 0), 0));
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('journal_entry_not_balanced');
    }
    if (input.lines.length < 2) {
      throw new Error('journal_entry_requires_at_least_two_lines');
    }

    const date = input.date ?? new Date();
    const period = periodFromDate(date);

    // Check if period is closed
    const closed = await AccountingService.getPeriodStatus(organizationId, period);
    if (closed) {
      throw new Error('period_is_closed');
    }

    // Auto-generate entry number
    const count = await safePrisma(() =>
      prisma.journalEntry.count({ where: { organizationId } }),
      0,
    );
    const entryNumber = `JE-${String(count + 1).padStart(4, '0')}`;

    return prisma.journalEntry.create({
      data: {
        organizationId,
        workspaceId,
        entryNumber,
        date,
        description: input.description ?? '',
        reference: input.reference ?? '',
        status: 'draft',
        period,
        isReversed: false,
        lines: {
          create: input.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description ?? '',
          })),
        },
      },
      include: { lines: true },
    });
  },

  /**
   * Get a single journal entry with its lines.
   */
  async getJournalEntry(id: string) {
    return safePrisma(() =>
      prisma.journalEntry.findUnique({
        where: { id },
        include: { lines: { include: { account: true } } },
      }),
      null,
    );
  },

  /**
   * List journal entries with optional filters.
   */
  async listJournalEntries(organizationId: string, opts?: ListJournalEntriesOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.status) where.status = opts.status;
    if (opts?.period) where.period = opts.period;
    if (opts?.fromDate || opts?.toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (opts?.fromDate) dateFilter.gte = opts.fromDate;
      if (opts?.toDate) dateFilter.lte = opts.toDate;
      where.date = dateFilter;
    }
    return safePrisma(() =>
      prisma.journalEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 200,
        include: { lines: true },
      }),
      [],
    );
  },

  /**
   * Post a journal entry — change status from draft to posted.
   */
  async postJournalEntry(id: string) {
    const entry = await safePrisma(() =>
      prisma.journalEntry.findUnique({ where: { id } }),
      null,
    );
    if (!entry) throw new Error('journal_entry_not_found');
    if ((entry as JournalEntryRow).status === 'posted') {
      throw new Error('journal_entry_already_posted');
    }
    return prisma.journalEntry.update({
      where: { id },
      data: { status: 'posted' },
      include: { lines: true },
    });
  },

  /**
   * Reverse a journal entry — create a reversal entry with swapped debits/credits.
   */
  async reverseJournalEntry(id: string, reason: string) {
    const entry = await safePrisma(() =>
      prisma.journalEntry.findUnique({
        where: { id },
        include: { lines: true },
      }),
      null,
    );
    if (!entry) throw new Error('journal_entry_not_found');
    const row = entry as JournalEntryRow & { lines: JournalLineRow[] };
    if (row.isReversed) throw new Error('journal_entry_already_reversed');

    const count = await safePrisma(() =>
      prisma.journalEntry.count({ where: { organizationId: row.organizationId } }),
      0,
    );
    const reversalNumber = `JE-${String(count + 1).padStart(4, '0')}`;
    const now = new Date();
    const period = periodFromDate(now);

    const reversal = await prisma.journalEntry.create({
      data: {
        organizationId: row.organizationId,
        workspaceId: row.workspaceId,
        entryNumber: reversalNumber,
        date: now,
        description: `Reversal of ${row.entryNumber}: ${reason}`.slice(0, 5000),
        reference: row.reference,
        status: 'posted',
        period,
        isReversed: false,
        reversedBy: row.id,
        lines: {
          create: row.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.credit,
            credit: l.debit,
            description: `Reversal: ${l.description}`.slice(0, 5000),
          })),
        },
      },
      include: { lines: true },
    });

    // Mark the original as reversed
    await prisma.journalEntry.update({
      where: { id: row.id },
      data: { isReversed: true, reversedBy: reversal.id },
    }).catch(() => null);

    return reversal;
  },

  /**
   * Get the trial balance — all accounts with debit/credit balances.
   */
  async getTrialBalance(organizationId: string, opts?: TrialBalanceOpts): Promise<TrialBalance> {
    const accounts = await safePrisma(() =>
      prisma.gLAccount.findMany({
        where: { organizationId },
        orderBy: { code: 'asc' },
      }),
      [],
    );

    const lines: TrialBalanceLine[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const a of accounts as GLAccountRow[]) {
      const bal = await AccountingService.getAccountBalance(organizationId, a.id);
      const isDebitNormal = a.type === 'asset' || a.type === 'expense';
      const debit = isDebitNormal && bal.balance > 0 ? bal.balance : 0;
      const credit = !isDebitNormal && bal.balance > 0 ? bal.balance : 0;
      // Handle negative balances (contra accounts)
      const finalDebit = bal.balance < 0 && !isDebitNormal ? Math.abs(bal.balance) : debit;
      const finalCredit = bal.balance < 0 && isDebitNormal ? Math.abs(bal.balance) : credit;
      lines.push({
        accountId: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        debit: round2(finalDebit),
        credit: round2(finalCredit),
      });
      totalDebits += finalDebit;
      totalCredits += finalCredit;
    }

    return {
      lines,
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
    };
  },

  /**
   * Get financial statements — balance sheet, income statement, and cash flow summary.
   */
  async getFinancialStatements(
    organizationId: string,
    opts?: FinancialStatementsOpts,
  ): Promise<FinancialStatements> {
    const trial = await AccountingService.getTrialBalance(organizationId, {
      asOfDate: opts?.toDate,
    });

    const assets = trial.lines.filter((l) => l.type === 'asset');
    const liabilities = trial.lines.filter((l) => l.type === 'liability');
    const equity = trial.lines.filter((l) => l.type === 'equity');
    const revenue = trial.lines.filter((l) => l.type === 'revenue');
    const expenses = trial.lines.filter((l) => l.type === 'expense');

    const totalAssets = round2(assets.reduce((s, l) => s + l.debit - l.credit, 0));
    const totalLiabilities = round2(liabilities.reduce((s, l) => s + l.credit - l.debit, 0));
    const totalEquity = round2(equity.reduce((s, l) => s + l.credit - l.debit, 0));
    const totalRevenue = round2(revenue.reduce((s, l) => s + l.credit - l.debit, 0));
    const totalExpenses = round2(expenses.reduce((s, l) => s + l.debit - l.credit, 0));
    const netIncome = round2(totalRevenue - totalExpenses);

    // Simplified cash flow summary — derived from balance changes
    const operating = round2(netIncome);
    const investing = round2(
      assets
        .filter((l) => l.subtype === 'fixed_asset' || l.code.startsWith('15'))
        .reduce((s, l) => s - (l.debit - l.credit), 0),
    );
    const financing = round2(
      equity.reduce((s, l) => s + (l.credit - l.debit), 0) +
        liabilities
          .filter((l) => l.code.startsWith('22') || l.code.startsWith('23'))
          .reduce((s, l) => s + (l.credit - l.debit), 0),
    );

    return {
      balanceSheet: {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
      },
      incomeStatement: {
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netIncome,
      },
      cashFlowSummary: {
        operating,
        investing,
        financing,
        netChange: round2(operating + investing + financing),
      },
    };
  },

  /**
   * Get the general ledger — journal lines by account and/or date range.
   */
  async getGeneralLedger(
    organizationId: string,
    opts?: GeneralLedgerOpts,
  ): Promise<GeneralLedgerLine[]> {
    const where: Record<string, unknown> = { journalEntry: { organizationId, status: 'posted' } };
    if (opts?.accountId) where.accountId = opts.accountId;
    if (opts?.fromDate || opts?.toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (opts?.fromDate) dateFilter.gte = opts.fromDate;
      if (opts?.toDate) dateFilter.lte = opts.toDate;
      const existingJE = where.journalEntry as Record<string, unknown>;
      where.journalEntry = { ...existingJE, date: dateFilter };
    }
    const lines = await safePrisma(() =>
      prisma.journalLine.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 1000,
        include: {
          account: true,
          journalEntry: true,
        },
      }),
      [],
    );
    return (lines as Array<JournalLineRow & { account: GLAccountRow; journalEntry: JournalEntryRow }>).map(
      (l) => ({
        journalEntryId: l.journalEntryId,
        entryNumber: l.journalEntry.entryNumber,
        date: l.journalEntry.date,
        description: l.journalEntry.description,
        reference: l.journalEntry.reference,
        status: l.journalEntry.status,
        accountId: l.accountId,
        accountCode: l.account.code,
        accountName: l.account.name,
        debit: l.debit,
        credit: l.credit,
        lineDescription: l.description,
      }),
    );
  },

  /**
   * Close a period — mark all draft entries in the period as posted and
   * record the closed period in Memory to prevent new entries.
   */
  async closePeriod(organizationId: string, period: string) {
    // Post all draft entries in the period
    await prisma.journalEntry.updateMany({
      where: { organizationId, period, status: 'draft' },
      data: { status: 'posted' },
    }).catch(() => null);

    // Record the closed period in Memory
    const workspaces = await safePrisma(() =>
      prisma.workspace.findFirst({ where: { organizationId } }),
      null,
    );
    const workspaceId = (workspaces as { id: string } | null)?.id ?? organizationId;

    return prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'closed_period',
        content: JSON.stringify({ organizationId, period, closedAt: new Date().toISOString() }),
        source: 'system',
        tags: JSON.stringify(['accounting', 'closed_period', period]),
        createdBy: 'system',
      },
    });
  },

  /**
   * Check if a period is closed (using Memory type='closed_period').
   */
  async getPeriodStatus(organizationId: string, period: string): Promise<boolean> {
    const records = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'closed_period' },
        take: 500,
      }),
      [],
    );
    return (records as MemoryRow[]).some((m) => {
      try {
        const data = JSON.parse(m.content) as { period?: string };
        return data.period === period;
      } catch {
        return false;
      }
    });
  },

  /**
   * Get accounting stats for an organization.
   */
  async getStats(organizationId: string): Promise<AccountingStats> {
    const [accounts, activeAccounts, entryCount, postedCount, draftCount, closedPeriods] =
      await Promise.all([
        safePrisma(() => prisma.gLAccount.count({ where: { organizationId } }), 0),
        safePrisma(() => prisma.gLAccount.count({ where: { organizationId, isActive: true } }), 0),
        safePrisma(() => prisma.journalEntry.count({ where: { organizationId } }), 0),
        safePrisma(() => prisma.journalEntry.count({ where: { organizationId, status: 'posted' } }), 0),
        safePrisma(() => prisma.journalEntry.count({ where: { organizationId, status: 'draft' } }), 0),
        safePrisma(() => prisma.memory.count({ where: { organizationId, type: 'closed_period' } }), 0),
      ]);

    // Sum debits and credits across posted entries
    const entries = await safePrisma(() =>
      prisma.journalEntry.findMany({
        where: { organizationId, status: 'posted' },
        select: { lines: { select: { debit: true, credit: true } } },
      }),
      [],
    );
    let totalDebits = 0;
    let totalCredits = 0;
    for (const e of entries as Array<{ lines: Array<{ debit: number; credit: number }> }>) {
      for (const l of e.lines) {
        totalDebits += l.debit;
        totalCredits += l.credit;
      }
    }

    return {
      accountCount: accounts as number,
      activeAccountCount: activeAccounts as number,
      journalEntryCount: entryCount as number,
      postedEntryCount: postedCount as number,
      draftEntryCount: draftCount as number,
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
      closedPeriods: closedPeriods as number,
    };
  },
};
