const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch(e) { reject(new Error(buf)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const cards = [
  {
    front: 'Gross Profit',
    back: 'Revenue minus Cost of Goods Sold (COGS). It measures how efficiently a company produces its goods or services before accounting for overhead, interest, and taxes.\n\n**Formula:** Gross Profit = Total Revenue − COGS\n\n**Location:** Income Statement (P&L)',
    tags: ['income-statement', 'profitability']
  },
  {
    front: 'Most Common Expenses',
    back: 'The major expense categories on a company\'s Income Statement:\n\n1. **COGS** — Direct costs of producing goods/services\n2. **SG&A** — Selling, General & Administrative (salaries, rent, marketing)\n3. **Depreciation & Amortization (D&A)** — Non-cash allocation of asset costs\n4. **Interest Expense** — Cost of borrowed debt\n5. **Taxes** — Income taxes owed to government\n\nThese are subtracted from revenue in sequence to arrive at Net Income.',
    tags: ['income-statement', 'expenses']
  },
  {
    front: 'Income Statement (P&L)',
    back: 'A financial statement that reports a company\'s revenues, expenses, and profit/loss over a specific period (quarter or year). Also called the Profit & Loss Statement.\n\n**Structure (top to bottom):**\nRevenue → COGS → Gross Profit → SG&A → EBITDA → D&A → EBIT → Interest → Taxes → **Net Income**\n\n**Key question it answers:** Did the company make or lose money during this period?',
    tags: ['financial-statements', 'income-statement']
  },
  {
    front: 'Balance Sheet',
    back: 'A financial statement that shows what a company owns (Assets), what it owes (Liabilities), and the residual value belonging to shareholders (Equity) at a specific point in time.\n\n**Fundamental equation:** Assets = Liabilities + Equity\n\n**Key difference from P&L:** The Balance Sheet is a snapshot (point in time), while the Income Statement covers a period of time.',
    tags: ['financial-statements', 'balance-sheet']
  },
  {
    front: 'Cash Flow Statement',
    back: 'A financial statement that tracks the actual cash moving in and out of a business during a period.\n\n**Key questions it answers:**\n• How much cash did the company generate during the period?\n• Where did the cash come from?\n\n**Three sections:**\n1. **Operating Activities** — Cash from core business operations\n2. **Investing Activities** — Cash spent on/received from assets (PP&E, acquisitions)\n3. **Financing Activities** — Cash from/to debt holders and equity holders (loans, dividends, share buybacks)',
    tags: ['financial-statements', 'cash-flow']
  },
  {
    front: 'Cost of Goods Sold (COGS)',
    back: 'The direct costs attributable to producing the goods or services a company sells. Includes raw materials, direct labor, and manufacturing overhead directly tied to production.\n\n**Location:** Income Statement — subtracted from Revenue to get Gross Profit\n**Category:** Expense\n\n**Examples:** Raw materials, factory labor, packaging, freight-in\n**Not included:** Rent for corporate office, marketing, executive salaries (those are SG&A)',
    tags: ['income-statement', 'expenses']
  },
  {
    front: 'Selling, General, and Administrative Expenses (SG&A)',
    back: 'Operating expenses not directly tied to production. Covers the costs of running the business day-to-day.\n\n**Location:** Income Statement — subtracted after Gross Profit\n**Category:** Expense\n\n**Includes:**\n• **Selling:** Sales commissions, advertising, marketing\n• **General:** Rent, utilities, office supplies, insurance\n• **Administrative:** Executive salaries, legal fees, accounting fees\n\nSG&A + COGS are subtracted from Revenue to determine operating profitability.',
    tags: ['income-statement', 'expenses']
  },
  {
    front: 'EBITDA',
    back: 'Earnings Before Interest, Tax, Depreciation & Amortization. A measure of a company\'s core operating profitability before capital structure, tax jurisdiction, and accounting decisions.\n\n**Formula:** Total Revenue − (COGS + SG&A)\n**Or:** Operating Income + D&A\n\n**Location:** Income Statement (Operating Income level)\n\n**Why it matters:** Allows comparison between companies regardless of debt levels, tax rates, or depreciation methods. Widely used in valuation (EV/EBITDA multiples).',
    tags: ['income-statement', 'profitability', 'valuation']
  },
  {
    front: 'Depreciation & Amortization (D&A)',
    back: 'Non-cash expenses that allocate the cost of an asset over its useful life.\n\n• **Depreciation** — applies to tangible assets (buildings, equipment, vehicles)\n• **Amortization** — applies to intangible assets (patents, software, goodwill)\n\n**Location:** Income Statement — subtracted from EBITDA to get EBIT\n**Category:** Expense (non-cash)\n\n**Key insight:** D&A reduces reported earnings but does NOT reduce cash — which is why it\'s added back in cash flow statements and EBITDA calculations.',
    tags: ['income-statement', 'expenses', 'non-cash']
  },
  {
    front: 'EBIT',
    back: 'Earnings Before Interest and Taxes. Also called Operating Income or Operating Profit.\n\n**Formula:** EBITDA − D&A\n**Or:** Revenue − COGS − SG&A − D&A\n\n**Location:** Income Statement\n\n**What it shows:** How much profit the company earns from operations before the cost of debt (interest) and taxes. Useful for comparing operating performance across companies with different capital structures.',
    tags: ['income-statement', 'profitability']
  },
  {
    front: 'Interest Expenses',
    back: 'The cost a company pays to service its debt (loans, bonds, credit facilities). It represents the price of borrowing money.\n\n**Location:** Income Statement — subtracted from EBIT\n**Category:** Expense\n\n**Formula impact:** EBIT − Interest Expense = EBT (Earnings Before Tax)\n\n**Key insight:** Interest expense is tax-deductible, which creates a "tax shield" — one reason companies use debt financing.',
    tags: ['income-statement', 'expenses', 'debt']
  },
  {
    front: 'Taxes',
    back: 'Income taxes owed to federal, state, and local governments on the company\'s taxable income.\n\n**Location:** Income Statement — subtracted from EBT (Earnings Before Tax) to arrive at Net Income\n**Category:** Expense\n\n**Formula:** EBT × Tax Rate = Tax Expense\n**Then:** EBT − Taxes = Net Income\n\n**Note:** The tax expense on the Income Statement often differs from actual cash taxes paid due to deferred tax assets/liabilities.',
    tags: ['income-statement', 'expenses']
  },
  {
    front: 'Net Income',
    back: 'The "bottom line" — the company\'s total profit after ALL expenses have been subtracted from revenue.\n\n**Formula:** Revenue − COGS − SG&A − D&A − Interest − Taxes = Net Income\n\n**Location:** Bottom of the Income Statement\n\n**Where it goes next:** Net Income flows into Retained Earnings on the Balance Sheet (as part of Equity), creating the critical link between the two statements.',
    tags: ['income-statement', 'profitability']
  },
  {
    front: 'How involved are Financial Analysts and Finance Managers with tax discussions?',
    back: 'Minimally involved. Tax strategy is typically handled by **tax accountants, tax attorneys, and CPAs** who specialize in tax law.\n\nFinancial Analysts and Finance Managers need to:\n• Understand the **impact** of taxes on cash flow and valuation\n• Know the company\'s **effective tax rate** for modeling\n• Recognize **deferred tax** implications\n\nBut they do **not** typically make tax elections, file returns, or advise on tax structure — that\'s a specialized function.',
    tags: ['income-statement', 'professional-practice']
  },
  {
    front: 'Average Tax Rate',
    back: 'The total tax paid divided by total taxable income, expressed as a percentage. Represents the overall tax burden on the company.\n\n**Formula:** Average Tax Rate = Total Tax Expense ÷ Earnings Before Tax (EBT)\n\n**Location:** Derived from Income Statement\n\n**vs. Marginal Tax Rate:** The marginal rate is the tax on the next dollar earned (the bracket rate). The average rate is the blended rate across all income — it\'s always lower than or equal to the marginal rate.',
    tags: ['income-statement', 'taxes']
  },
  {
    front: 'What are the 2 most common forms of Depreciation to capture expense?',
    back: '1. **Straight-Line Depreciation** — Allocates equal expense each year over the asset\'s useful life\n   Formula: (Cost − Salvage Value) ÷ Useful Life\n\n2. **Activity-Based Depreciation** (Units of Production) — Allocates expense based on actual usage or output\n   Formula: (Cost − Salvage Value) ÷ Total Expected Units × Units Produced\n\n**Location:** Income Statement (as part of D&A)\n\nStraight-line is simpler and more common; activity-based better reflects actual wear on assets like machinery.',
    tags: ['income-statement', 'depreciation']
  },
  {
    front: 'Straight-Line Depreciation Method',
    back: 'The simplest and most common depreciation method. Spreads the cost of an asset evenly over its useful life.\n\n**Formula:** (Asset Cost − Salvage Value) ÷ Useful Life in Years\n\n**Example:** Machine costs $100,000, salvage value $10,000, useful life 10 years\nAnnual depreciation = ($100K − $10K) ÷ 10 = **$9,000/year**\n\n**Location:** Income Statement\n**When to use:** When the asset delivers roughly equal benefit each year (buildings, furniture, general equipment).',
    tags: ['income-statement', 'depreciation']
  },
  {
    front: 'Activity-Based Depreciation Method',
    back: 'A depreciation method that allocates cost based on actual usage or production output rather than time.\n\n**Formula:** (Cost − Salvage Value) ÷ Total Expected Units × Actual Units Produced\n\n**Example:** Machine costs $200K, salvage $20K, expected to produce 100,000 units.\nPer-unit depreciation = $1.80. If Year 1 produces 15,000 units → $27,000 depreciation.\n\n**Location:** Income Statement\n**When to use:** When asset wear is driven by usage, not time (vehicles by mileage, equipment by hours/units).',
    tags: ['income-statement', 'depreciation']
  },
  {
    front: 'Intangible Assets',
    back: 'Non-physical assets that have value due to legal rights or competitive advantages they provide.\n\n**Examples:**\n• Patents, trademarks, copyrights\n• Goodwill (from acquisitions)\n• Brand recognition\n• Software, licenses\n• Customer lists, franchise agreements\n\n**Location:** Balance Sheet (long-term assets)\n**Expense method:** Amortized (not depreciated) over useful life on the Income Statement\n\n**Key distinction:** Depreciation is for tangible assets; Amortization is for intangible assets.',
    tags: ['income-statement', 'balance-sheet', 'assets']
  },
  {
    front: 'Depreciation vs Amortization',
    back: 'Both are methods of expensing an asset\'s cost over time, but they apply to different asset types:\n\n**Depreciation:**\n• Applies to **tangible** (physical) assets\n• Buildings, machinery, vehicles, equipment\n• Methods: straight-line, activity-based, declining balance\n\n**Amortization:**\n• Applies to **intangible** (non-physical) assets\n• Patents, software, goodwill, trademarks\n• Usually straight-line method\n\n**Both:** Non-cash expenses on the Income Statement, added back in cash flow calculations.',
    tags: ['income-statement', 'depreciation']
  },
  {
    front: 'Single Step P&L',
    back: 'A simplified Income Statement format that groups ALL revenues together and ALL expenses together, then calculates Net Income in one step.\n\n**Format:**\nTotal Revenues\n− Total Expenses\n= **Net Income**\n\n**Pros:** Simple, easy to read\n**Cons:** Doesn\'t show Gross Profit, Operating Income, or EBITDA — makes it harder to analyze where profitability is coming from\n\n**Used by:** Smaller companies or for internal simplified reporting.',
    tags: ['income-statement', 'financial-statements']
  },
  {
    front: 'Multi-Step Income Statement',
    back: 'The standard, detailed Income Statement format used by most public companies. Separates operating from non-operating activities and shows multiple profitability levels.\n\n**Format:**\nRevenue\n− COGS = **Gross Profit**\n− SG&A = **EBITDA**\n− D&A = **EBIT (Operating Income)**\n− Interest = **EBT**\n− Taxes = **Net Income**\n\n**Pros:** Shows where profits/losses originate; enables margin analysis at each level\n**Used by:** Most public companies, analysts, and financial models.',
    tags: ['income-statement', 'financial-statements']
  },
  {
    front: 'Cash',
    back: 'The most liquid asset on the Balance Sheet. Includes physical currency, bank deposits, and cash equivalents (short-term investments easily convertible to cash, like money market funds or T-bills maturing within 90 days).\n\n**Location:** Balance Sheet — Current Assets (listed first)\n**Category:** Asset\n\n**Why it matters:** Cash is the lifeblood of a business. A company can be profitable on the Income Statement but still fail if it runs out of cash (cash flow ≠ profit).',
    tags: ['balance-sheet', 'assets', 'current-assets']
  },
  {
    front: 'Accounts Receivable',
    back: 'Money owed TO the company by customers for goods or services already delivered but not yet paid for. Essentially, it\'s an IOU from clients.\n\n**Location:** Balance Sheet — Current Assets\n**Category:** Asset\n\n**Example:** You deliver consulting services in March, invoice the client Net 30 — until they pay, that amount sits in Accounts Receivable.\n\n**Risk:** Bad debt — some receivables may never be collected. Companies maintain an "Allowance for Doubtful Accounts" to estimate this.',
    tags: ['balance-sheet', 'assets', 'current-assets']
  },
  {
    front: 'Inventory',
    back: 'Goods a company holds for sale or materials used in production. A current asset that will be converted to revenue when sold.\n\n**Location:** Balance Sheet — Current Assets\n**Category:** Asset\n\n**Three types:**\n1. **Raw Materials** — Inputs not yet used\n2. **Work-in-Progress (WIP)** — Partially completed goods\n3. **Finished Goods** — Ready for sale\n\n**When sold:** Inventory cost moves from the Balance Sheet to COGS on the Income Statement.',
    tags: ['balance-sheet', 'assets', 'current-assets']
  },
  {
    front: 'Property, Plant, and Equipment (PP&E) / CapEx',
    back: 'Long-term tangible assets used in operations — not held for sale. Also called Fixed Assets.\n\n**Location:** Balance Sheet — Non-Current Assets\n**Category:** Asset\n\n**Examples:** Land, buildings, machinery, vehicles, data center infrastructure\n\n**CapEx (Capital Expenditure):** The cash spent to acquire or improve PP&E. Appears on the Cash Flow Statement (investing activities), NOT the Income Statement.\n\n**On the Income Statement:** PP&E is expensed over time through Depreciation (D&A).',
    tags: ['balance-sheet', 'assets', 'capex']
  },
  {
    front: 'Accounts Payable',
    back: 'Money the company owes TO suppliers and vendors for goods or services already received but not yet paid for. The mirror image of Accounts Receivable.\n\n**Location:** Balance Sheet — Current Liabilities\n**Category:** Liability (because it has not been paid yet)\n\n**Example:** You receive $50K of raw materials from a supplier on Net 60 terms — until you pay, it\'s Accounts Payable.\n\n**Cash flow impact:** Increasing AP means the company is holding onto cash longer (good for cash flow in the short term).',
    tags: ['balance-sheet', 'liabilities', 'current-liabilities']
  },
  {
    front: 'Financial Liabilities',
    back: 'Obligations to pay money that arise from borrowing or financing arrangements. Represents the debt a company has taken on.\n\n**Location:** Balance Sheet — Liabilities (current and non-current)\n**Category:** Liability\n\n**Examples:**\n• Short-term loans, lines of credit (current)\n• Bonds payable, long-term loans, mortgages (non-current)\n• Lease obligations (under IFRS 16 / ASC 842)\n\n**Related:** Interest Expense on these liabilities flows through the Income Statement.',
    tags: ['balance-sheet', 'liabilities', 'debt']
  },
  {
    front: 'Ownership Claims',
    back: 'The claims that owners (shareholders) have on the company\'s assets after all liabilities are paid. This is **Equity** on the Balance Sheet.\n\n**Location:** Balance Sheet — Equity section\n**Category:** Liability side of the equation (but represents ownership, not debt)\n\n**Fundamental equation:** Assets − Liabilities = Equity (Ownership Claims)\n\n**Components:** Common stock, additional paid-in capital, retained earnings, treasury stock\n\n**Key insight:** If a company liquidates, creditors (liabilities) get paid first; shareholders get what\'s left.',
    tags: ['balance-sheet', 'equity']
  },
  {
    front: 'What is Equity Made of?',
    back: 'Equity (Shareholders\' Equity) on the Balance Sheet consists of:\n\n1. **Common Stock** — Par value of shares issued\n2. **Additional Paid-In Capital (APIC)** — Amount paid above par value when shares were issued\n3. **Retained Earnings** — Cumulative Net Income kept in the business (not paid as dividends)\n4. **Treasury Stock** — Shares the company bought back (reduces equity)\n5. **Other Comprehensive Income (OCI)** — Unrealized gains/losses (foreign currency, investments)\n\n**Formula:** Equity = Common Stock + APIC + Retained Earnings − Treasury Stock + OCI',
    tags: ['balance-sheet', 'equity']
  },
  {
    front: 'What Connects the Balance Sheet to P&L (Income Statement)?',
    back: '**Net Income** is the bridge between the two statements.\n\nNet Income (bottom of the Income Statement) flows into **Retained Earnings** on the Balance Sheet, which is a component of Equity.\n\n**Formula:** Ending Retained Earnings = Beginning Retained Earnings + Net Income − Dividends Paid\n\nThis is why the accounting equation always balances: when a company earns profit, both Assets (cash) and Equity (retained earnings) increase by the same amount.',
    tags: ['financial-statements', 'balance-sheet', 'income-statement']
  },
  {
    front: '10-K Report',
    back: 'The annual report filed with the SEC (Securities and Exchange Commission) by public companies. Provides a comprehensive overview of the company\'s business and financial condition.\n\n**Contains:**\n• Audited financial statements (Income Statement, Balance Sheet, Cash Flow)\n• Management Discussion & Analysis (MD&A)\n• Business description and risk factors\n• Executive compensation\n• Legal proceedings\n\n**vs. 10-Q:** The 10-Q is the quarterly version (unaudited, less detailed)\n**vs. Annual Report:** The glossy annual report is a marketing document; the 10-K is the legal filing.',
    tags: ['financial-statements', 'sec-filings']
  },
  {
    front: 'Accrued Expenses',
    back: 'Expenses that have been incurred but not yet paid. Recognized on the Income Statement in the period they occur, even though cash hasn\'t left the company yet.\n\n**Location:** Balance Sheet — Current Liabilities\n**Category:** Liability\n\n**Key distinction:** For personnel/internal costs within the company, NOT for suppliers of goods and services (those are Accounts Payable).\n\n**Examples:** Wages owed to employees, utility bills received but unpaid, interest accrued on loans, bonuses earned but not yet distributed.',
    tags: ['balance-sheet', 'liabilities', 'accruals']
  },
  {
    front: 'Prepaid Expenses',
    back: 'Payments made in advance for goods or services that will be received in the future. The company has paid cash but hasn\'t yet received the benefit.\n\n**Location:** Balance Sheet — Current Assets\n**Category:** Asset (because the company is owed future value)\n\n**Examples:** Prepaid rent, prepaid insurance, annual software subscriptions paid upfront\n\n**Over time:** As the benefit is consumed, the prepaid amount moves from the Balance Sheet (asset decreases) to the Income Statement (expense increases).',
    tags: ['balance-sheet', 'assets', 'accruals']
  },
  {
    front: 'Unearned Revenue',
    back: 'Money received from customers BEFORE the company has delivered the goods or services. The company owes the customer future performance.\n\n**Location:** Balance Sheet — Current Liabilities\n**Category:** Liability (the company owes a product/service, not cash)\n\n**Examples:** Annual subscriptions paid upfront, deposits on custom orders, gift cards sold but not redeemed\n\n**When earned:** As the company delivers, Unearned Revenue (liability) decreases and Revenue (Income Statement) increases.',
    tags: ['balance-sheet', 'liabilities', 'accruals']
  },
  {
    front: 'What are the 4 categories of accruals?',
    back: '1. **Accrued Revenue** — Revenue earned but not yet received in cash\n   (Asset on Balance Sheet: Accounts Receivable)\n\n2. **Accrued Expenses** — Expenses incurred but not yet paid in cash\n   (Liability on Balance Sheet: Accrued Liabilities)\n\n3. **Prepaid Expenses** — Cash paid before expense is incurred\n   (Asset on Balance Sheet: Prepaid Expenses)\n\n4. **Unearned Revenue** — Cash received before revenue is earned\n   (Liability on Balance Sheet: Unearned Revenue)\n\nAccruals ensure revenues and expenses are recognized when they **occur**, not when cash moves.',
    tags: ['accruals', 'accounting-principles']
  },
  {
    front: 'What is accrual accounting?',
    back: 'An accounting method where revenue and expenses are recorded when they are **earned or incurred**, regardless of when cash actually changes hands.\n\n**Opposite:** Cash-basis accounting (records only when cash is received/paid)\n\n**Why it matters:** Accrual accounting gives a more accurate picture of a company\'s financial health by matching revenues with the expenses that generated them.\n\n**Required by:** GAAP and IFRS for all public companies\n\n**Example:** You deliver services in December but get paid in January — under accrual accounting, the revenue is recorded in December.',
    tags: ['accounting-principles', 'accruals']
  },
  {
    front: 'Accrued Revenue',
    back: 'Revenue that has been earned (product delivered or service performed) but not yet billed or received in cash.\n\n**Location:** Balance Sheet — Current Assets (as Accounts Receivable or Accrued Revenue)\n**Category:** Asset\n\n**Example:** A consulting firm completes 2 weeks of work in December but doesn\'t invoice until January. The revenue is accrued in December.\n\n**Journal entry:**\nDebit: Accounts Receivable (Asset ↑)\nCredit: Revenue (Income ↑)',
    tags: ['accruals', 'income-statement', 'balance-sheet']
  },
  {
    front: 'Accrued Revenue — Delivered but NOT yet paid\n\nHow it posts on Income Statement & Balance Sheet',
    back: 'When a product/service is delivered but the client hasn\'t paid yet:\n\n**Income Statement:**\n• Revenue is **recognized** (increases top line) because the earning event occurred\n\n**Balance Sheet:**\n• **Accounts Receivable increases** (Asset ↑) — the company is owed money\n• **Equity increases** (via Retained Earnings) — because Revenue flows to Net Income\n\n**Journal entry:**\nDebit: Accounts Receivable (Asset ↑)\nCredit: Revenue (Income ↑)\n\nThe Balance Sheet stays balanced: Assets ↑ = Equity ↑',
    tags: ['accruals', 'journal-entries']
  },
  {
    front: 'Accrued Revenue — Delivered AND paid by client\n\nHow it posts on Income Statement & Balance Sheet',
    back: 'When the client pays for previously accrued revenue:\n\n**Income Statement:**\n• **No change** — Revenue was already recognized when the service was delivered\n\n**Balance Sheet:**\n• **Cash increases** (Asset ↑)\n• **Accounts Receivable decreases** (Asset ↓)\n• Net effect on Assets = zero (one asset swaps for another)\n\n**Journal entry:**\nDebit: Cash (Asset ↑)\nCredit: Accounts Receivable (Asset ↓)\n\nThis is purely a Balance Sheet transaction — the P&L is unaffected because revenue was already booked.',
    tags: ['accruals', 'journal-entries']
  },
  {
    front: 'Revenue Recognition Criteria',
    back: 'Under ASC 606 (GAAP) / IFRS 15, revenue is recognized when a company satisfies a **performance obligation** — i.e., transfers control of goods/services to the customer.\n\n**5-step model:**\n1. Identify the contract with the customer\n2. Identify the performance obligations in the contract\n3. Determine the transaction price\n4. Allocate the price to each performance obligation\n5. Recognize revenue as each obligation is satisfied\n\n**Key principle:** Revenue is recognized when **earned**, not when cash is received.',
    tags: ['accounting-principles', 'income-statement']
  },
  {
    front: 'Product Cost (Matching Principle)',
    back: 'Costs directly tied to producing a product that are expensed on the Income Statement **when the related revenue is recognized** — not when the cost is incurred.\n\n**Matching Principle:** Expenses should be recognized in the same period as the revenue they help generate.\n\n**Example:** A company manufactures widgets in October (cost goes to Inventory on the Balance Sheet). The widgets sell in December — ONLY THEN does the cost move to COGS on the Income Statement.\n\n**Result:** Revenue and its related cost appear in the same period, giving an accurate picture of profitability.',
    tags: ['accounting-principles', 'matching-principle']
  },
  {
    front: 'Revenue & Related Costs (Matching Principle)',
    back: 'The Matching Principle requires that costs directly associated with generating revenue be recognized in the **same accounting period** as that revenue.\n\n**Examples:**\n• Sales commission paid when a deal closes → recognized when the sale\'s revenue is recorded\n• Shipping costs for delivered goods → recognized when the sale is booked\n• Warranty expense → estimated and recorded at time of sale\n\n**Why it matters:** Without matching, a company could show high revenue in one period and the costs in another — distorting true profitability.',
    tags: ['accounting-principles', 'matching-principle']
  },
  {
    front: 'Period Costs (Matching Principle)',
    back: 'Costs that are NOT directly tied to producing a specific product or generating specific revenue. They are expensed in the period they are incurred, regardless of sales.\n\n**Examples:**\n• Rent, utilities, office supplies\n• Executive salaries, HR costs\n• Marketing and advertising\n• Depreciation on office equipment\n\n**Location:** Income Statement — typically under SG&A\n\n**vs. Product Costs:** Product costs attach to inventory and hit the P&L when sold. Period costs hit the P&L immediately in the period incurred.',
    tags: ['accounting-principles', 'matching-principle']
  },
  {
    front: 'Revenue does not = Cash',
    back: 'A critical concept in accrual accounting: **recording revenue does NOT mean cash was received.**\n\nRevenue is recognized when earned (goods delivered / services performed), but cash may arrive:\n• Before (Unearned Revenue — a liability)\n• At the same time (cash sale)\n• After (Accounts Receivable — an asset)\n\n**Why it matters:** A company can show strong revenue and Net Income on the P&L but still run out of cash. This is why the **Cash Flow Statement** exists — it reconciles accrual profits to actual cash movement.\n\n**Mantra:** "Revenue is an opinion. Cash is a fact."',
    tags: ['accounting-principles', 'cash-flow']
  },
  {
    front: 'Asset — Debit & Credit',
    back: 'Assets follow the **normal debit balance** rule:\n\n• **Debit (Dr)** → Increases the asset\n• **Credit (Cr)** → Decreases the asset\n\n**Examples:**\n• Receive cash: Debit Cash (↑ asset)\n• Pay cash: Credit Cash (↓ asset)\n• Customer pays invoice: Debit Cash (↑), Credit Accounts Receivable (↓)\n\n**Memory aid:** Assets are on the LEFT side of the accounting equation (Assets = Liabilities + Equity), and debits are on the LEFT side of journal entries.',
    tags: ['accounting-principles', 'debits-credits']
  },
  {
    front: 'Liability — Debit & Credit',
    back: 'Liabilities follow the **normal credit balance** rule — the inverse of assets:\n\n• **Credit (Cr)** → Increases the liability\n• **Debit (Dr)** → Decreases the liability\n\n**Examples:**\n• Take out a loan: Credit Loans Payable (↑ liability)\n• Make a loan payment: Debit Loans Payable (↓ liability)\n• Receive unearned revenue: Credit Unearned Revenue (↑ liability)\n\n**Memory aid:** Liabilities are on the RIGHT side of the equation, and credits are on the RIGHT side of journal entries.',
    tags: ['accounting-principles', 'debits-credits']
  },
  {
    front: 'Equity — Debit & Credit',
    back: 'Equity follows the **normal credit balance** rule — the inverse of assets (same as liabilities):\n\n• **Credit (Cr)** → Increases equity\n• **Debit (Dr)** → Decreases equity\n\n**Examples:**\n• Company earns profit: Credit Retained Earnings (↑ equity)\n• Pay dividends: Debit Retained Earnings (↓ equity)\n• Issue new shares: Credit Common Stock / APIC (↑ equity)\n\n**Revenue** behaves like a credit (increases equity). **Expenses** behave like a debit (decrease equity).',
    tags: ['accounting-principles', 'debits-credits']
  },
  {
    front: 'General Ledger',
    back: 'The master accounting record that contains ALL of a company\'s financial transactions, organized by account. It is the central repository from which financial statements are prepared.\n\n**Structure:** Each account (Cash, AR, Revenue, etc.) has its own page/section showing all debits and credits\n\n**Contains:** Every transaction across all accounts — assets, liabilities, equity, revenue, expenses\n\n**Relationship:** The General Ledger summarizes data from Subsidiary Ledgers and the journal entries\n\n**Output:** Trial Balance → Financial Statements are generated from the General Ledger.',
    tags: ['accounting-principles', 'bookkeeping']
  },
  {
    front: 'Subsidiary Ledger',
    back: 'A detailed ledger that breaks down a single General Ledger account into individual sub-accounts. Provides granular detail that would clutter the General Ledger.\n\n**Examples:**\n• **Accounts Receivable Subsidiary Ledger** — individual balances for each customer\n• **Accounts Payable Subsidiary Ledger** — individual balances for each vendor\n• **Inventory Subsidiary Ledger** — detail by product/SKU\n\n**Relationship:** The total of all entries in a Subsidiary Ledger must equal the control account balance in the General Ledger.\n\n**Think of it as:** Zooming in on one line item of the General Ledger.',
    tags: ['accounting-principles', 'bookkeeping']
  },
  {
    front: 'What do revenues behave like on the Income Statement?',
    back: 'Revenues behave like **Credits** (same as Equity).\n\n• **Credit (Cr)** → Increases revenue\n• **Debit (Dr)** → Decreases revenue (returns, allowances)\n\n**Why?** Revenue increases Net Income, which increases Retained Earnings, which increases Equity. Since Equity has a normal credit balance, Revenue does too.\n\n**Journal entry when a sale is made:**\nDebit: Cash or Accounts Receivable (Asset ↑)\nCredit: Revenue (Revenue ↑ → Equity ↑)',
    tags: ['accounting-principles', 'debits-credits', 'income-statement']
  },
  {
    front: 'What do costs/expenses behave like on the Income Statement?',
    back: 'Expenses behave like **Debits** (same as Assets) — the inverse of Revenue and Equity.\n\n• **Debit (Dr)** → Increases the expense\n• **Credit (Cr)** → Decreases the expense\n\n**Why?** Expenses decrease Net Income, which decreases Retained Earnings, which decreases Equity. Since decreasing Equity requires a debit, expenses have a normal debit balance.\n\n**Journal entry when an expense is incurred:**\nDebit: Expense (Expense ↑ → Equity ↓)\nCredit: Cash or Accounts Payable (Asset ↓ or Liability ↑)',
    tags: ['accounting-principles', 'debits-credits', 'income-statement']
  }
];

async function main() {
  const topic = await post('/api/topics', {
    name: 'A.CRE',
    description: 'Adventures in CRE — Financial statements, accounting principles, and corporate finance fundamentals.',
    color: '#059669',
    icon: 'book'
  });
  console.log('Created topic:', topic.id, topic.name);

  const cardSet = await post('/api/topics/' + topic.id + '/sets', {
    name: 'Financial Statements & Accounting Fundamentals',
    description: 'Income Statement, Balance Sheet, Cash Flow Statement, accrual accounting, debits & credits, and core financial concepts.'
  });
  console.log('Created card set:', cardSet.id, cardSet.name);

  let created = 0;
  for (const c of cards) {
    await post('/api/sets/' + cardSet.id + '/cards', {
      tags: c.tags,
      front: { media_blocks: [{ block_type: 'text', text_content: c.front }] },
      back: { media_blocks: [{ block_type: 'text', text_content: c.back }] }
    });
    created++;
    if (created % 10 === 0) console.log('  ...', created, '/', cards.length);
  }
  console.log('Done! Created', created, 'flashcards in topic "A.CRE"');
}

main().catch(e => console.error('Error:', e));
