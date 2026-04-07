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

const TOPIC_ID = 'a6d8a81cb4eb42ea';

const cards = [
  {
    front: 'Term Loan Margin',
    back: 'The spread (in basis points or percentage) added on top of a base reference rate (e.g., SOFR, LIBOR) to determine the total interest rate on a term loan. For example, if SOFR is 5.00% and the margin is 2.50%, the borrower pays 7.50%. The margin compensates the lender for credit risk and is typically fixed for the life of the loan, though some structures include margin ratchets that adjust based on leverage or DSCR performance.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'DSCR Lock-up',
    back: 'A covenant threshold for the Debt Service Coverage Ratio below which the borrower is "locked up" from making distributions (dividends) to equity holders. Cash must instead be trapped in the project to protect lenders. For example, if the DSCR lock-up is 1.20x and the project\'s DSCR falls to 1.15x, all excess cash is retained in the project until the ratio recovers above the threshold. This is a softer remedy than default — the loan is not accelerated, but equity returns are suspended.',
    tags: ['finance', 'debt', 'covenants']
  },
  {
    front: 'DSCR Default',
    back: 'The Debt Service Coverage Ratio level at which the borrower is in technical default on the loan. This threshold is lower (more severe) than the DSCR lock-up level. For example, a typical structure might have DSCR lock-up at 1.20x and DSCR default at 1.05x or 1.10x. Breaching this trigger gives the lender the right to accelerate the loan, step in, or exercise other remedies specified in the credit agreement. It signals the project cannot adequately cover its debt payments.',
    tags: ['finance', 'debt', 'covenants']
  },
  {
    front: 'LLCR Lock-up',
    back: 'The Loan Life Coverage Ratio threshold below which distributions to equity are restricted. LLCR is a forward-looking metric that compares the NPV of all future Cash Flow Available for Debt Service (CFADS) over the remaining loan life to the outstanding debt balance. A typical LLCR lock-up might be 1.30x. Unlike DSCR which looks at a single period, LLCR captures the project\'s ability to service debt over the entire remaining loan term, making it a more comprehensive covenant.',
    tags: ['finance', 'debt', 'covenants']
  },
  {
    front: 'LLCR Default',
    back: 'The Loan Life Coverage Ratio level that constitutes a loan default. This is set below the LLCR lock-up threshold and triggers lender remedies including potential loan acceleration. For example, LLCR lock-up might be 1.30x while LLCR default is 1.10x. Because LLCR is calculated using the NPV of all remaining CFADS over the loan life divided by outstanding debt, breaching this threshold means the project\'s long-term cash generation is fundamentally insufficient to repay the loan.',
    tags: ['finance', 'debt', 'covenants']
  },
  {
    front: 'Grace Period',
    back: 'A defined window of time after a debt payment is due during which the borrower can make the payment without being considered in default. Grace periods are specified in the loan agreement and typically range from 5 to 30 days for interest payments. Some covenants also have cure periods (similar concept) allowing the borrower time to remedy a covenant breach. In project finance, grace periods protect against temporary cash flow timing mismatches while preserving lender rights.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Term Loan Tenor',
    back: 'The total duration (in years or months) from the first drawdown of a term loan to its final scheduled repayment date (maturity). In data center project finance, tenors typically range from 5 to 15 years, often aligned with the useful life of the asset or the length of key customer contracts (e.g., a 10-year hyperscaler lease). A longer tenor reduces periodic debt service payments but increases total interest cost and lender risk exposure.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'DSRA Look Forward',
    back: 'The number of months of future debt service that must be maintained in the Debt Service Reserve Account (DSRA) at all times. Typically 6 months of projected debt service (principal + interest). The "look forward" means the reserve is sized based on the next upcoming payment periods, not historical ones. If debt service varies due to sculpted repayment profiles, the DSRA balance must be recalculated and topped up or released each period to match the forward-looking requirement.',
    tags: ['finance', 'debt', 'reserves']
  },
  {
    front: 'DSRA Cushion',
    back: 'An additional buffer held in the Debt Service Reserve Account above the minimum required balance, providing extra protection against cash flow volatility. While the DSRA look-forward sets the minimum (e.g., 6 months of debt service), some lenders require or borrowers maintain an additional cushion (e.g., 10-20% above minimum) to avoid triggering a top-up requirement from minor fluctuations. The cushion reduces the frequency of cash sweeps needed to maintain compliance.',
    tags: ['finance', 'debt', 'reserves']
  },
  {
    front: 'Shareholder Loan',
    back: 'A loan made by the project\'s equity investors (shareholders/sponsors) to the project company, rather than contributing the funds as pure equity. Shareholder loans (SHLs) sit subordinate to senior debt but allow the sponsor to receive interest payments (tax-deductible to the project) rather than dividends (not tax-deductible). This creates a more tax-efficient capital structure. SHL repayments are typically restricted by the same distribution covenants (DSCR/LLCR lock-ups) that govern dividends.',
    tags: ['finance', 'equity', 'debt']
  },
  {
    front: 'Shareholder Loan Interest Rate p.a.',
    back: 'The annual interest rate charged on shareholder loans (SHLs) from sponsors to the project company. This rate must be set at arm\'s length to satisfy tax authorities — too high and tax deductions may be disallowed (thin capitalization rules). Typical SHL rates are set at a market-comparable level, often referencing the senior debt rate plus a spread to reflect subordination risk. The interest is a tax-deductible expense for the project company, making SHLs more tax-efficient than pure equity contributions.',
    tags: ['finance', 'equity', 'debt']
  },
  {
    front: 'Debt Service Coverage Ratio (DSCR)',
    back: 'A measure of a project\'s ability to cover its debt obligations from operating cash flow in a given period.\n\n**Formula:** DSCR = Cash Flow Available for Debt Service (CFADS) / Total Debt Service (Principal + Interest)\n\nA DSCR of 1.00x means cash flow exactly covers debt payments. Lenders typically require minimum DSCRs of 1.20x-1.40x for data center projects. Below 1.00x means the project cannot meet its debt obligations from operations.\n\n**Example:** If CFADS = $12M and annual debt service = $10M, DSCR = 1.20x.',
    tags: ['finance', 'debt', 'valuation']
  },
  {
    front: 'Loan Life Coverage Ratio (LLCR)',
    back: 'A forward-looking credit metric that measures the project\'s ability to repay the entire outstanding loan from future cash flows over the remaining loan life.\n\n**Formula:** LLCR = NPV(CFADS over remaining loan life) / Outstanding Debt Balance\n\nUnlike DSCR (single-period), LLCR captures total remaining repayment capacity. The NPV is calculated using the loan\'s effective interest rate as the discount rate. Typical minimum LLCR requirements are 1.20x-1.40x. An LLCR below 1.00x means the project\'s future cash flows cannot fully repay the debt.',
    tags: ['finance', 'debt', 'valuation']
  },
  {
    front: 'Project CAPEX',
    back: 'The total capital expenditure required to develop and construct the project to operational readiness. For a data center, this includes land acquisition, site preparation, building shell, power infrastructure (substations, generators, UPS), cooling systems (chillers, CRAHs), IT infrastructure, fire suppression, security, and soft costs (design, engineering, permitting, legal, financing fees, development management).\n\nProject CAPEX is the baseline investment used to calculate development yields, IRR, and gearing ratios. It\'s typically funded by a combination of equity and construction debt.',
    tags: ['finance', 'development', 'capex']
  },
  {
    front: 'Project Unlevered IRR',
    back: 'The Internal Rate of Return on the total project investment, calculated WITHOUT considering the effects of debt financing. It measures the project\'s pure asset-level return.\n\n**Inputs:** Total project CAPEX (outflow) and all future unlevered free cash flows (inflows), ignoring interest, principal repayments, and debt proceeds.\n\n**Why it matters:** Isolates the project\'s intrinsic return from its capital structure. If unlevered IRR exceeds the weighted average cost of capital (WACC), the project creates value. Comparing unlevered IRR to the cost of debt reveals the potential for positive leverage.',
    tags: ['finance', 'valuation', 'development']
  },
  {
    front: 'Blended Equity IRR',
    back: 'The Internal Rate of Return earned by all equity investors collectively, blending returns across different equity tranches (e.g., common equity, preferred equity, co-invest). It\'s the "levered" IRR — calculated after debt service — reflecting the actual return on equity capital deployed.\n\n**Formula:** The discount rate that makes NPV of all equity cash flows (contributions in, distributions out) equal to zero.\n\n**Key insight:** Leverage amplifies equity IRR when project returns exceed the cost of debt. If unlevered IRR is 10% and debt costs 6%, the equity IRR will exceed 10% due to the leverage effect.',
    tags: ['finance', 'equity', 'valuation']
  },
  {
    front: 'Construction Debt / Interest During Construction (IDC)',
    back: 'Interest During Construction (IDC) is the interest that accrues on construction loan drawdowns before the project generates revenue. Since construction debt is drawn incrementally as building progresses, IDC accumulates on the outstanding balance.\n\nIDC is typically capitalized — added to the total project cost rather than expensed — because the asset is not yet producing income. This increases the total capital cost basis of the project.\n\n**Example:** $200M construction facility drawn over 18 months at 7% results in approximately $10-14M of IDC, depending on the drawdown schedule.',
    tags: ['finance', 'debt', 'development']
  },
  {
    front: 'Debt Service Reserve Account (DSRA) Initial Deposit',
    back: 'The upfront cash deposit required to fund the DSRA at financial close or project completion. Typically sized at 6 months of projected debt service (principal + interest). This reserve acts as a liquidity cushion — if the project\'s operating cash flow temporarily falls short, the DSRA funds are used to make debt payments.\n\nThe initial deposit is funded from construction loan proceeds or equity contributions and is considered part of the total project funding requirement. It\'s a use of funds in the sources & uses table, not an operating expense.',
    tags: ['finance', 'debt', 'reserves']
  },
  {
    front: 'Construction Debt Drawdown Pro-Rata',
    back: 'A requirement that construction debt and equity are drawn down proportionally (pro-rata) during the construction period, rather than one source being fully depleted before the other. For example, if the project is 70% debt / 30% equity, each monthly draw would be funded 70% from the construction facility and 30% from equity.\n\n**Why lenders require this:** Ensures the sponsor has "skin in the game" throughout construction, not just at the end. Without pro-rata requirements, sponsors might fund 100% with debt first and only contribute equity late (or not at all if the project fails).',
    tags: ['finance', 'debt', 'development']
  },
  {
    front: 'PP&E Balance',
    back: 'Property, Plant & Equipment balance — the net book value of a company\'s tangible long-term assets as reported on the Balance Sheet.\n\n**Formula:** PP&E Balance = Gross PP&E (original cost) − Accumulated Depreciation\n\nFor a data center, PP&E includes land, buildings, power infrastructure, cooling systems, generators, UPS systems, and other physical assets. The balance decreases each period as depreciation is recorded (unless new CAPEX is added).\n\n**In project finance models:** PP&E drives depreciation expense, which is a non-cash charge that reduces taxable income and creates a tax shield.',
    tags: ['finance', 'accounting']
  },
  {
    front: 'Negative Cash Balance Check',
    back: 'A model integrity check in financial models that verifies the project never has a negative cash balance in any period. A negative cash balance is physically impossible — you cannot have less than zero cash — so it indicates the model has an error or the project requires additional funding.\n\n**Implementation:** A flag or formula row that returns TRUE/ERROR if the ending cash balance goes below zero in any period.\n\n**If triggered:** The financing structure needs adjustment — more equity, higher debt facility, different draw schedule, or the project economics don\'t work as modeled.',
    tags: ['finance', 'modeling']
  },
  {
    front: 'Permitted Dividends',
    back: 'Distributions from the project company to equity holders that are allowed under the terms of the senior loan agreement. Dividends are only "permitted" when all covenant tests are satisfied — typically:\n\n1. No event of default exists or would result from the distribution\n2. DSCR is above the lock-up level (e.g., >1.20x)\n3. LLCR is above the lock-up level (e.g., >1.30x)\n4. DSRA is fully funded\n5. All scheduled debt service payments are current\n\nAny dividend paid in violation of these conditions is a breach of covenant.',
    tags: ['finance', 'debt', 'equity', 'covenants']
  },
  {
    front: 'Tax Depreciation',
    back: 'The depreciation deduction allowed by tax authorities to reduce taxable income, which may differ from book depreciation used in financial statements. Tax depreciation methods (e.g., MACRS in the US) are often accelerated, allowing larger deductions in early years to incentivize capital investment.\n\n**For data centers:** Most equipment qualifies for 5, 7, or 15-year MACRS schedules. Buildings use 39-year straight-line. Bonus depreciation (when available) can allow 60-100% of qualifying asset costs to be deducted in Year 1.\n\n**Impact:** Accelerated tax depreciation creates timing differences (deferred tax liabilities) and improves early-year after-tax cash flows.',
    tags: ['finance', 'accounting', 'development']
  },
  {
    front: 'Financing Fees Tax Depreciation',
    back: 'The tax treatment of loan arrangement fees, commitment fees, and other financing costs. These fees are typically amortized (deducted) over the life of the loan for tax purposes, rather than expensed upfront.\n\n**Example:** A $2M arrangement fee on a 10-year loan would be deducted at $200K/year for tax purposes.\n\n**In financial models:** Financing fees are capitalized as a deferred asset on the Balance Sheet and amortized through the Income Statement. The amortization creates a tax deduction that reduces taxable income each period over the loan tenor.',
    tags: ['finance', 'debt', 'accounting']
  },
  {
    front: 'Unlevered EBT for Tax Purpose',
    back: 'Earnings Before Tax calculated on an unlevered basis — as if the project had no debt. This removes the interest expense deduction to isolate the project\'s pre-tax operating profitability independent of its capital structure.\n\n**Formula:** Revenue − Operating Expenses − Depreciation (no interest deduction)\n\n**Why it\'s used:** In project finance models, computing unlevered EBT helps separate the project\'s operating tax position from the effects of leverage. It\'s a stepping stone to calculating unlevered free cash flow and project-level (unlevered) IRR.',
    tags: ['finance', 'accounting', 'modeling']
  },
  {
    front: 'Unlevered Taxable Income Before NOL',
    back: 'The project\'s taxable income calculated without debt (unlevered) and before applying any Net Operating Loss (NOL) carryforwards. This represents the raw taxable income the project generates from operations.\n\n**Formula:** Revenue − Operating Expenses − Tax Depreciation (excluding interest expense)\n\n**Why before NOL:** NOL carryforwards from prior-year losses can offset current taxable income. Showing the figure before NOL application reveals the project\'s current-year tax-generating capacity. The NOL is then applied separately to determine actual taxes owed.',
    tags: ['finance', 'accounting', 'modeling']
  },
  {
    front: 'LLCR Calculated Based on the Effective Interest Rate',
    back: 'When computing LLCR, the NPV of future Cash Flow Available for Debt Service (CFADS) is discounted using the loan\'s effective interest rate — the all-in cost of debt including margin, fees, and any hedging costs — rather than a generic discount rate.\n\n**Formula:** LLCR = NPV(CFADS, discounted at effective interest rate) / Outstanding Debt\n\n**Why effective rate:** Using the actual borrowing cost ensures the LLCR reflects the true present-value burden of debt service. A higher effective rate reduces the NPV of CFADS, producing a lower (more conservative) LLCR.',
    tags: ['finance', 'debt', 'modeling']
  },
  {
    front: 'CFADS (Cash Flow Available for Debt Service)',
    back: 'The cash flow generated by a project that is available to pay senior debt obligations (interest + principal). It is the key input for calculating DSCR and LLCR.\n\n**Formula:** Revenue − Operating Expenses − Taxes − Maintenance Capex − Changes in Working Capital\n\n**What\'s excluded:** Debt service itself (that\'s what CFADS is compared to), equity distributions, and discretionary capital expenditure.\n\n**Why it matters:** CFADS is the single most important metric in project finance. It determines how much debt the project can support and whether covenants are met.',
    tags: ['finance', 'debt', 'modeling']
  },
  {
    front: 'EBITA',
    back: 'Earnings Before Interest, Taxes, and Amortization. Similar to EBITDA but does NOT add back depreciation — only amortization of intangible assets is excluded.\n\n**Formula:** EBIT + Amortization (but NOT depreciation)\n\n**Difference from EBITDA:** EBITA includes the depreciation of tangible assets as an expense, making it a more conservative profitability measure for capital-intensive businesses like data centers where physical asset depreciation is significant.\n\n**Use case:** Sometimes preferred for asset-heavy industries because depreciation represents real economic wear on physical infrastructure.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Unlevered Free Cash Flow',
    back: 'The cash flow generated by a project or business before any debt-related payments, representing the total cash available to ALL capital providers (debt + equity).\n\n**Formula:** EBIT × (1 − Tax Rate) + Depreciation & Amortization − Capital Expenditures − Changes in Working Capital\n\n**Also called:** Free Cash Flow to Firm (FCFF)\n\n**Why "unlevered":** Excludes interest expense and debt repayments, isolating the asset\'s cash-generating ability from its financing structure. Used to calculate project IRR and enterprise value in DCF analysis.',
    tags: ['finance', 'valuation', 'modeling']
  },
  {
    front: 'Project IRR',
    back: 'The Internal Rate of Return on the total project investment — the discount rate at which the Net Present Value (NPV) of all project cash flows equals zero.\n\n**Inputs:** Initial CAPEX outlay (negative) and all future unlevered free cash flows (positive), typically including a terminal/residual value.\n\n**Decision rule:** If Project IRR > WACC (weighted average cost of capital), the project creates value.\n\n**For data centers:** Target project IRRs typically range from 8-15% depending on risk profile (core vs. development), market, and tenant credit quality.',
    tags: ['finance', 'valuation', 'development']
  },
  {
    front: 'Sponsor Total Cash Flows',
    back: 'The complete set of cash flows from the perspective of the equity sponsor/investor. Includes all equity contributions (negative cash flows) and all distributions received (positive cash flows) over the project\'s life.\n\n**Outflows:** Equity contributions during development/construction, DSRA funding, working capital\n**Inflows:** Permitted dividends, shareholder loan interest and principal repayment, residual value upon sale/refinancing\n\n**Used to calculate:** Levered equity IRR and equity multiple. This is the "what does the sponsor actually earn?" view of the project.',
    tags: ['finance', 'equity', 'modeling']
  },
  {
    front: 'Paid-in Capital',
    back: 'The total amount of cash equity that sponsors/investors have actually contributed ("paid in") to the project, as distinguished from committed but undrawn capital. On the Balance Sheet, it appears as part of Shareholders\' Equity.\n\n**Components:** Par value of shares + Additional Paid-in Capital (APIC, the premium above par value)\n\n**In project finance:** Paid-in capital represents the sponsor\'s actual cash investment in the project company, as opposed to shareholder loans. It\'s the denominator in cash-on-cash return calculations and a key input to equity multiple computation.',
    tags: ['finance', 'equity', 'accounting']
  },
  {
    front: 'Gearing Ratio',
    back: 'The proportion of a project\'s total capital that is funded by debt versus equity. Also called leverage ratio.\n\n**Formula:** Gearing = Total Debt / (Total Debt + Equity) or Total Debt / Total Capital\n\n**Example:** A $500M data center funded with $350M debt and $150M equity has 70% gearing (70/30 D/E).\n\n**Typical ranges:** Data center development projects typically see 50-75% gearing. Higher gearing amplifies equity returns but increases risk. Lenders set maximum gearing ratios as a covenant. Investment-grade tenants and long-term leases support higher gearing.',
    tags: ['finance', 'debt', 'equity']
  },
  {
    front: 'SHL (Shareholder Loan)',
    back: 'A subordinated loan from equity sponsors to the project company. SHLs are structured as debt but function as quasi-equity from the senior lender\'s perspective.\n\n**Key features:**\n- Subordinated to all senior debt\n- Interest payments restricted by same covenants as dividends\n- Interest is tax-deductible (unlike dividends)\n- Repayment ranks behind senior debt in a waterfall\n\n**Why use SHLs instead of pure equity:** Tax efficiency — SHL interest reduces the project\'s taxable income. The sponsor effectively receives the same cash flow but with a lower tax burden at the project level.',
    tags: ['finance', 'equity', 'debt']
  },
  {
    front: 'P&L Report (Profit & Loss / Income Statement)',
    back: 'A financial statement showing revenues, expenses, and resulting profit or loss over a specific period (monthly, quarterly, annually).\n\n**Structure (top to bottom):**\nRevenue → COGS → Gross Profit → SG&A → EBITDA → D&A → EBIT → Interest → EBT → Taxes → Net Income\n\n**For data center projects:** Revenue comes from colocation/lease fees, power pass-through, and managed services. Key expenses include power costs, maintenance, property taxes, insurance, and staffing.\n\n**Key insight:** P&L shows profitability but NOT cash flow — non-cash items like depreciation are included as expenses.',
    tags: ['finance', 'accounting']
  },
  {
    front: 'Balance Sheet',
    back: 'A financial statement showing what a company owns (Assets), owes (Liabilities), and the residual belonging to owners (Equity) at a specific point in time.\n\n**Fundamental equation:** Assets = Liabilities + Equity\n\n**For data center projects:**\n- **Assets:** Land, building, power/cooling infrastructure (PP&E), cash, receivables\n- **Liabilities:** Senior debt, construction loans, accounts payable, deferred revenue\n- **Equity:** Paid-in capital, retained earnings, shareholder loans (sometimes classified here)\n\n**Key insight:** The Balance Sheet is a snapshot (point in time), not a period like the P&L.',
    tags: ['finance', 'accounting']
  },
  {
    front: 'Cash Flow Statement',
    back: 'A financial statement tracking actual cash movements in and out of the business during a period. Reconciles the gap between net income (accrual) and actual cash generated.\n\n**Three sections:**\n1. **Operating:** Cash from core operations (net income + non-cash adjustments + working capital changes)\n2. **Investing:** Cash spent on/received from assets (CAPEX, acquisitions, asset sales)\n3. **Financing:** Cash from/to capital providers (debt drawdowns, repayments, equity contributions, dividends)\n\n**For data centers:** Operating CF driven by lease revenue minus operating costs. Investing CF dominated by CAPEX. Financing CF reflects debt/equity structure.',
    tags: ['finance', 'accounting']
  },
  {
    front: 'Cash on Cash Return',
    back: 'The annual pre-tax cash flow received by an equity investor divided by the total equity invested. A simple, unleveraged-style return metric that ignores appreciation, depreciation, and tax benefits.\n\n**Formula:** Cash on Cash Return = Annual Pre-Tax Cash Flow / Total Equity Invested\n\n**Example:** $150K equity invested, $12K annual cash flow = 8.0% cash-on-cash return.\n\n**Limitations:** Ignores property appreciation, loan paydown, tax benefits, and time value of money. It\'s a "what am I getting in my pocket each year?" measure. Typically used alongside IRR and equity multiple for a complete picture.',
    tags: ['finance', 'equity', 'valuation']
  },
  {
    front: 'Term Loan',
    back: 'A loan with a fixed repayment schedule over a set period (tenor), as opposed to a revolving credit facility. The borrower receives the full principal upfront (or draws it during construction) and repays via scheduled installments of principal plus interest.\n\n**Key features:**\n- Fixed maturity date (5-15 years typical for data centers)\n- Amortizing (principal reduces over time) or bullet (principal repaid at maturity)\n- Interest = base rate + margin\n- Secured by project assets\n\n**In project finance:** The term loan is the primary senior debt instrument, typically replacing the construction facility upon project completion.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Net Operating Income (NOI)',
    back: 'The income generated by a real estate asset after deducting all operating expenses but BEFORE debt service, income taxes, capital expenditures, and depreciation.\n\n**Formula:** NOI = Effective Gross Revenue − Operating Expenses\n\n**Operating expenses include:** Property taxes, insurance, maintenance, management fees, utilities (non-pass-through)\n**Excluded:** Debt service, income taxes, CAPEX, depreciation, leasing commissions\n\n**Why it matters:** NOI is the foundational metric in CRE valuation. It\'s used to calculate cap rates, debt coverage ratios, and property value. For data centers, NOI is driven by lease revenue minus facility operating costs.',
    tags: ['finance', 'valuation', 'development']
  },
  {
    front: 'Total Debt Service',
    back: 'The total amount of principal repayment plus interest payments due on all debt obligations in a given period (usually annual).\n\n**Formula:** Total Debt Service = Principal Repayment + Interest Payments (across all loans)\n\n**Includes:** Senior term loan payments, mezzanine debt service, and any other contractual debt obligations. Does NOT include shareholder loan payments (those are typically subordinated and treated differently).\n\n**Used in:** DSCR calculation (CFADS / Total Debt Service). A critical planning metric — debt service is a fixed obligation that must be met regardless of occupancy or revenue fluctuations.',
    tags: ['finance', 'debt']
  },
  {
    front: 'CAP Rate (Capitalization Rate)',
    back: 'The ratio of a property\'s Net Operating Income to its current market value or purchase price. Used to estimate the value of income-producing properties.\n\n**Formula:** Cap Rate = NOI / Property Value (or Price)\n**Rearranged:** Property Value = NOI / Cap Rate\n\n**Example:** $10M NOI / 6.0% cap rate = $166.7M property value.\n\n**For data centers:** Cap rates typically range from 5-8% depending on market, tenant credit quality, remaining lease term, and power/cooling infrastructure quality. Lower cap rates = higher values = lower risk perception.\n\n**Key insight:** Cap rate is an inverse of a price-to-earnings ratio for real estate.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'LTV Ratio (Loan-to-Value)',
    back: 'The ratio of the outstanding loan balance to the appraised market value of the property. A key risk metric for lenders.\n\n**Formula:** LTV = Loan Balance / Property Appraised Value\n\n**Example:** $120M loan on a property appraised at $200M = 60% LTV.\n\n**Typical requirements:** Senior lenders usually cap LTV at 60-75% for data centers. Lower LTV = more equity cushion = lower lender risk. If property value declines and LTV exceeds the covenant threshold, the borrower may need to pay down the loan or post additional collateral.\n\n**Differs from Loan-to-Cost (LTC):** LTV is based on market value; LTC is based on development cost.',
    tags: ['finance', 'debt', 'valuation']
  },
  {
    front: 'Equity Multiple',
    back: 'The total cash returned to an equity investor divided by the total equity invested. Measures the absolute return on investment regardless of timing.\n\n**Formula:** Equity Multiple = Total Distributions Received / Total Equity Invested\n\n**Example:** Invest $10M, receive $18M total over 5 years = 1.8x equity multiple.\n\n**Interpretation:** 1.0x = break even, 2.0x = doubled your money, 3.0x = tripled\n\n**Limitation:** Ignores the time value of money. A 2.0x return in 3 years is far better than 2.0x in 10 years, but both show the same multiple. Always pair with IRR for a complete picture.',
    tags: ['finance', 'equity', 'valuation']
  },
  {
    front: 'Debt Yield',
    back: 'A lender-focused metric that measures the property\'s NOI as a percentage of the total loan amount. It indicates the return the lender would receive if they took ownership of the property.\n\n**Formula:** Debt Yield = NOI / Loan Amount\n\n**Example:** $10M NOI / $125M loan = 8.0% debt yield.\n\n**Why lenders use it:** Unlike DSCR (which depends on interest rate and amortization) or LTV (which depends on appraisal), debt yield is independent of loan terms and property valuation. It provides a pure measure of the loan\'s risk relative to the property\'s income. Minimum thresholds are typically 8-10%.',
    tags: ['finance', 'debt', 'valuation']
  },
  {
    front: 'Sensitivity Analysis',
    back: 'A financial modeling technique that tests how changes in key input assumptions affect output metrics (IRR, NPV, DSCR, etc.). It answers: "What happens if things don\'t go as planned?"\n\n**Common approaches:**\n- **One-way:** Change one variable at a time (e.g., rent ±10%)\n- **Two-way (data table):** Change two variables simultaneously\n- **Scenario analysis:** Define best/base/worst cases across multiple variables\n\n**For data centers:** Key sensitivities include construction cost overruns, lease-up timing, power cost escalation, cap rate at exit, and interest rate changes. Results often presented as tornado charts or sensitivity tables.',
    tags: ['finance', 'modeling']
  },
  {
    front: 'Interest Coverage Ratio (ICR)',
    back: 'A measure of a company\'s ability to pay interest on its outstanding debt from operating earnings.\n\n**Formula:** ICR = EBIT / Interest Expense\n\n**Example:** EBIT of $15M / Interest expense of $5M = 3.0x ICR.\n\n**Interpretation:** An ICR below 1.0x means the company cannot cover interest from operations. Lenders typically require minimum ICRs of 2.0x-3.0x.\n\n**Difference from DSCR:** ICR only measures ability to pay interest (not principal). DSCR measures ability to cover total debt service (interest + principal). ICR is always higher than DSCR for the same project since the denominator is smaller.',
    tags: ['finance', 'debt', 'covenants']
  },
  {
    front: 'Average Rate of Return',
    back: 'The average annual return on an investment over its holding period, calculated as the arithmetic mean of periodic returns.\n\n**Formula:** Average Rate of Return = (Sum of Annual Returns) / Number of Years\n**Or:** Average Annual Profit / Initial Investment\n\n**Limitation:** Does not account for the time value of money or compounding. A project earning 20% in Year 1 and 0% in Year 2 shows the same 10% average as one earning 10% in both years — but the first is actually better due to compounding. IRR is the superior metric for investment comparison.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Bridge Loan',
    back: 'Short-term financing (typically 6-36 months) used to "bridge" the gap until permanent financing is secured or a specific event occurs (e.g., lease-up, stabilization, sale).\n\n**Key features:**\n- Higher interest rates than permanent debt (often 300-600 bps above base rate)\n- Interest-only payments (no amortization)\n- Quick to close, flexible terms\n- Extension options common (with fees)\n\n**Data center use cases:** Bridge from construction completion to stabilization, bridge to acquisition financing, bridge while awaiting lease execution. The exit strategy (how the bridge will be repaid) is critical to underwriting.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Buildup Rate',
    back: 'A method of constructing a discount rate or capitalization rate by adding together its component risk premiums, starting from a risk-free rate.\n\n**Typical buildup:** Risk-Free Rate + Equity Risk Premium + Size Premium + Industry Risk Premium + Company/Project-Specific Risk\n\n**Example:** 4.5% (risk-free) + 6.0% (equity) + 2.0% (size) + 1.5% (industry) + 2.0% (project-specific) = 16.0% discount rate\n\n**For data centers:** Project-specific risk factors include market maturity, tenant concentration, power availability, entitlement risk, and construction complexity. More risk = higher buildup = lower present value.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Cash-out Refinance',
    back: 'Replacing an existing loan with a new, larger loan and extracting the difference as cash to the equity sponsor. This allows investors to recover capital without selling the asset.\n\n**Example:** Property worth $200M with existing $80M loan. New loan at 65% LTV = $130M. After paying off $80M existing loan, sponsor extracts $50M cash.\n\n**For data centers:** Common after stabilization when NOI has increased and the property can support more debt. The cash-out returns equity to sponsors, reducing their basis and increasing levered IRR. Lenders underwrite cash-out refis based on stabilized NOI and updated appraisal.',
    tags: ['finance', 'debt', 'equity']
  },
  {
    front: 'Cash Sweep',
    back: 'A mandatory mechanism in loan agreements requiring excess cash flow (after operating expenses, debt service, and reserves) to be used for accelerated principal repayment rather than distributed to equity holders.\n\n**Triggers:** Often activated when covenant ratios (DSCR, LLCR) fall below specified levels, or as a standard feature in project finance structures.\n\n**Types:**\n- **Full sweep:** 100% of excess cash applied to debt\n- **Partial sweep:** A percentage (e.g., 50-75%) swept, remainder available for distribution\n\n**Impact:** Reduces outstanding debt faster, improving coverage ratios, but delays equity returns.',
    tags: ['finance', 'debt', 'covenants']
  },
  {
    front: 'Catch-up Provision',
    back: 'A clause in private equity/fund structures that allows the general partner (GP) to receive a disproportionately larger share of profits for a period after the limited partners (LPs) have received their preferred return, until the GP "catches up" to its target promote split.\n\n**How it works:** LPs receive 100% of distributions until they achieve their preferred return (e.g., 8%). Then the GP receives 100% (or a high percentage) of the next distributions until it has received its target share (e.g., 20%) of total profits. After catch-up, remaining profits split per the standard waterfall (e.g., 80/20).\n\n**Result:** The GP ends up with its full promote percentage of total profits, not just profits above the preferred return.',
    tags: ['finance', 'equity', 'legal']
  },
  {
    front: 'Clawback Provision',
    back: 'A contractual provision in fund/partnership agreements requiring the general partner (GP) to return previously received promote/carried interest if, at the end of the fund\'s life, the LP has not received its agreed-upon preferred return on all investments in aggregate.\n\n**Why it exists:** Early fund distributions may overpay the GP if later investments perform poorly. The clawback ensures fairness by truing up the GP\'s total compensation based on overall fund performance.\n\n**Example:** GP receives $5M promote from early deals, but later deals lose money. At fund wind-down, the GP must return $2M so LPs achieve their minimum 8% preferred return across all investments.',
    tags: ['finance', 'equity', 'legal']
  },
  {
    front: 'Concessions or Inducement',
    back: 'Financial incentives offered by a landlord to a tenant to secure a lease. Common in commercial real estate to attract or retain tenants, especially in competitive markets or during lease-up.\n\n**Common types:**\n- **Free rent:** Months of zero rent at lease start\n- **Tenant improvement (TI) allowance:** Landlord-funded buildout dollars per SF\n- **Moving allowance:** Reimbursement for relocation costs\n- **Reduced rent periods:** Stepped rent schedules starting below market\n\n**Impact on valuation:** Concessions reduce effective rent and are deducted from gross revenue when calculating effective gross revenue and NOI.',
    tags: ['leasing', 'development']
  },
  {
    front: 'Construction-to-Permanent Loan (Construction Perm)',
    back: 'A single loan that converts from a construction loan to permanent (long-term) financing upon project completion, avoiding the need to close two separate loans.\n\n**Phase 1 — Construction:** Interest-only payments on amounts drawn. Funds disbursed against construction progress.\n**Phase 2 — Permanent:** Upon conversion (at completion/stabilization), the loan converts to a fully amortizing term loan with a fixed or floating rate.\n\n**Advantages:** Single closing saves legal/transaction costs. Rate lock at closing provides certainty. Eliminates refinancing risk at completion.\n**Disadvantage:** May have less favorable terms than best-available permanent financing obtained separately.',
    tags: ['finance', 'debt', 'development']
  },
  {
    front: 'Contingency Cost',
    back: 'A budget reserve included in the project CAPEX to cover unforeseen costs, design changes, and construction risks. Expressed as a percentage of hard costs or total project costs.\n\n**Typical ranges:**\n- Hard cost contingency: 5-10% of construction costs\n- Soft cost contingency: 5-15% of soft costs\n- Overall project contingency: 5-10% of total budget\n\n**For data centers:** Higher contingency is warranted for complex power infrastructure, greenfield sites, or markets with supply chain risk. As construction progresses and risks are resolved, unused contingency may be released. Lenders require contingency in the budget and monitor its drawdown closely.',
    tags: ['finance', 'development']
  },
  {
    front: 'Crystallization',
    back: 'In finance, the point at which a floating or contingent interest becomes fixed and enforceable. Most commonly used in the context of:\n\n1. **Floating charges:** A floating security interest over a company\'s assets "crystallizes" into a fixed charge upon a trigger event (default, liquidation), at which point the lender\'s claim attaches to specific assets.\n\n2. **Tax context:** The realization event that triggers a capital gains tax liability (e.g., selling an asset "crystallizes" the gain).\n\n3. **Carried interest/promote:** The point at which a GP\'s promote entitlement is calculated and locked in based on actual fund performance.',
    tags: ['finance', 'legal']
  },
  {
    front: 'General Partner (GP) vs Limited Partner (LP)',
    back: '**General Partner (GP):**\n- Manages the fund/project and makes investment decisions\n- Has unlimited liability (in traditional partnerships; mitigated via LLC structures)\n- Earns management fees (1-2%) and carried interest/promote (15-20%)\n- Contributes a small share of equity (1-5%)\n\n**Limited Partner (LP):**\n- Passive investor who provides the majority of capital (95-99%)\n- Liability limited to their investment amount\n- Receives preferred return before GP promote\n- No management authority or day-to-day decision rights\n\n**Alignment mechanism:** GP co-invests own capital to ensure "skin in the game."',
    tags: ['finance', 'equity', 'legal']
  },
  {
    front: 'Debt Covenants',
    back: 'Contractual restrictions and requirements in a loan agreement that the borrower must comply with throughout the life of the loan. Designed to protect lender interests.\n\n**Affirmative covenants (must do):** Maintain insurance, provide financial reports, maintain assets, comply with laws\n**Negative covenants (must not do):** No additional debt without consent, no asset sales, no change of control, no distributions if DSCR < threshold\n**Financial covenants:** Minimum DSCR, maximum LTV, minimum LLCR, minimum debt yield\n\n**Breach consequences:** Waiver request, cash sweep, lock-up, default, loan acceleration.',
    tags: ['finance', 'debt', 'covenants', 'legal']
  },
  {
    front: 'Deed in Lieu of Foreclosure',
    back: 'A voluntary transfer of property ownership from the borrower to the lender to satisfy the outstanding mortgage debt, avoiding the formal foreclosure process.\n\n**Advantages for borrower:** Avoids public foreclosure proceedings, may negotiate release from deficiency balance, less damaging to credit\n**Advantages for lender:** Faster and less expensive than foreclosure, avoids litigation, immediate asset control\n\n**Requirements:** The property must be free of other liens/encumbrances (or those must be resolved). Both parties must agree — the lender is not obligated to accept.\n\n**Risk for lender:** May not release guarantor obligations unless explicitly agreed.',
    tags: ['finance', 'debt', 'legal']
  },
  {
    front: 'Defeasance',
    back: 'A loan prepayment method where the borrower substitutes government securities (typically US Treasuries) that generate cash flows matching the remaining loan payment schedule, effectively releasing the property from the mortgage lien without actually paying off the loan early.\n\n**Why it exists:** Many CMBS and fixed-rate loans prohibit prepayment or charge yield maintenance penalties. Defeasance allows the borrower to sell or refinance the property by replacing the collateral.\n\n**Cost:** The borrower buys a portfolio of Treasuries whose coupons and maturities exactly match the remaining debt service schedule. This can be expensive, especially in low-rate environments where Treasuries cost more than the outstanding loan balance.',
    tags: ['finance', 'debt', 'legal']
  },
  {
    front: 'Delaware Statutory Trust (DST)',
    back: 'A legal entity created under Delaware law that allows multiple investors to hold fractional ownership interests in real estate assets. Commonly used as replacement property in 1031 tax-deferred exchanges.\n\n**Key features:**\n- Passive investment — trustee manages the property\n- Investors receive proportional income and tax benefits\n- Qualifies as "like-kind" property for 1031 exchanges\n- No voting rights for beneficiaries\n- Cannot accept new capital contributions after closing\n\n**For data centers:** DSTs have emerged as a vehicle for institutional investors to offer fractional ownership in stabilized data center assets to 1031 exchange buyers.',
    tags: ['finance', 'legal', 'equity']
  },
  {
    front: 'Development Spread',
    back: 'The difference between a project\'s development yield (stabilized NOI / total development cost) and the prevailing market cap rate for comparable stabilized assets. This spread represents the value created through development.\n\n**Formula:** Development Spread = Development Yield − Market Cap Rate\n\n**Example:** Development yield of 9.0% − Market cap rate of 6.0% = 300 bps development spread.\n\n**What it means:** The developer earns a 300 bps premium for taking development risk. A wider spread = more profit at stabilization. If the development yield is below the market cap rate, the project destroys value (costs more to build than the finished product is worth).',
    tags: ['finance', 'development', 'valuation']
  },
  {
    front: 'Development Yield',
    back: 'The stabilized Net Operating Income of a project divided by its total development cost. Measures the return generated by the development investment once the asset is fully leased and operating.\n\n**Formula:** Development Yield = Stabilized NOI / Total Development Cost\n\n**Example:** Stabilized NOI of $18M / Total cost of $200M = 9.0% development yield.\n\n**Compared to cap rate:** If the development yield exceeds the market cap rate, the development creates value on paper at completion. The difference (development spread) is the developer\'s profit margin.\n\n**For data centers:** Development yields are typically 100-400 bps above market cap rates, compensating for construction, lease-up, and entitlement risk.',
    tags: ['finance', 'development', 'valuation']
  },
  {
    front: 'Discount Rate',
    back: 'The rate used to convert future cash flows to present value, reflecting the time value of money and the risk associated with those cash flows. Higher risk = higher discount rate = lower present value.\n\n**Determination methods:**\n- **WACC:** Weighted average cost of debt and equity\n- **Buildup method:** Risk-free rate + layered risk premiums\n- **Market comparison:** Rates used in comparable transactions\n\n**For data centers:** Discount rates for DCF analysis typically range from 7-15%, depending on whether the asset is stabilized (lower) or in development (higher), tenant credit quality, and market fundamentals.\n\n**Key relationship:** Discount rate = the minimum return an investor requires to justify the investment.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Discounted Cash Flow (DCF)',
    back: 'A valuation methodology that estimates the present value of an investment by discounting its expected future cash flows at an appropriate discount rate.\n\n**Formula:** PV = CF₁/(1+r)¹ + CF₂/(1+r)² + ... + CFₙ/(1+r)ⁿ + Terminal Value/(1+r)ⁿ\n\n**Steps:**\n1. Project future cash flows (typically 10 years for CRE)\n2. Estimate terminal/residual value (usually NOI year n+1 / exit cap rate)\n3. Discount all cash flows to present value\n4. Sum = enterprise/property value\n\n**For data centers:** DCF captures lease escalations, rollover risk, tenant credit, CAPEX reserves, and reversion value. It\'s the gold standard for institutional CRE valuation.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Earn-out',
    back: 'A contractual provision in an acquisition where a portion of the purchase price is contingent on the property or business achieving specified future performance milestones after closing.\n\n**Example:** Buyer pays $180M at close + up to $20M additional if the data center achieves 95% occupancy within 18 months.\n\n**Why it\'s used:** Bridges valuation gaps between buyer and seller. The seller believes the asset is worth more based on future performance; the earn-out lets the seller prove it and get paid accordingly.\n\n**Risks:** Disputes over how milestones are measured. Buyer may not manage the asset to maximize earn-out payments. Careful contract drafting is critical.',
    tags: ['finance', 'legal', 'valuation']
  },
  {
    front: 'Earnest Money Deposit (EMD)',
    back: 'A good-faith deposit made by a buyer when executing a Purchase and Sale Agreement (PSA) to demonstrate serious intent. The deposit is held in escrow and applied to the purchase price at closing.\n\n**Typical amount:** 1-5% of purchase price for CRE transactions.\n\n**Key terms:**\n- **Refundable period:** During due diligence (inspection period), the buyer can terminate and recover the deposit\n- **"Going hard":** After the due diligence period expires, the deposit becomes non-refundable — the seller keeps it if the buyer doesn\'t close\n- **Day-one hard:** No refundability from the start (aggressive markets)\n\n**Risk:** Buyer loses the deposit if they fail to close after the refundable period expires.',
    tags: ['finance', 'legal', 'development']
  },
  {
    front: 'Economic Vacancy',
    back: 'The total income loss from a property due to both physical vacancy (unoccupied space) AND collection losses (tenants who occupy space but don\'t pay). Also includes concessions like free rent months.\n\n**Formula:** Economic Vacancy = Physical Vacancy + Credit/Collection Loss + Concessions\n\n**Example:** A data center is 95% leased (5% physical vacancy) but one tenant is behind on rent (1% loss) and another has 3 months free rent (0.5% annualized) = ~6.5% economic vacancy.\n\n**Why it matters:** Economic vacancy is always equal to or greater than physical vacancy. Using only physical vacancy overstates effective revenue.',
    tags: ['finance', 'leasing', 'valuation']
  },
  {
    front: 'Effective Gross Revenue (EGR)',
    back: 'The actual revenue a property generates after accounting for vacancy and collection losses. It\'s the real income available before operating expenses.\n\n**Formula:** EGR = Potential Gross Revenue − Vacancy & Collection Losses + Other Income\n\n**Components:**\n- **Potential Gross Revenue:** Maximum rent if 100% occupied at market rates\n- **Vacancy & Collection Losses:** Economic vacancy deduction\n- **Other Income:** Parking, storage, utility reimbursements, antenna leases\n\n**For data centers:** Other income can include power markup over utility cost, cross-connect fees, remote hands services, and managed services revenue.',
    tags: ['finance', 'leasing', 'valuation']
  },
  {
    front: 'Entitlement Process',
    back: 'The governmental approval process required before a development project can be constructed. Entitlements grant legal permission to develop a property for a specific use, density, and configuration.\n\n**Common entitlements include:**\n- Zoning approvals or rezoning\n- Conditional use permits / special use permits\n- Site plan approval\n- Environmental review (NEPA, CEQA)\n- Building permits\n- Utility connection approvals\n\n**For data centers:** Key entitlement challenges include power allocation from utilities, noise ordinances (generators), water usage permits (cooling), and community opposition. The entitlement process can take 6-24+ months and represents significant pre-development risk.',
    tags: ['development', 'legal']
  },
  {
    front: 'Expense Stop',
    back: 'A lease provision that sets a base level of operating expenses paid by the landlord, with any expenses above that "stop" amount passed through to the tenant. Common in office and commercial leases.\n\n**How it works:** The landlord covers operating expenses up to the stop amount (often set at year-1 actual expenses). If expenses increase in subsequent years, the tenant pays the overage proportionally.\n\n**Example:** Expense stop set at $12/SF. If actual expenses rise to $14/SF, the tenant pays the $2/SF excess.\n\n**For data centers:** Less common in NNN data center leases (where tenants pay all operating expenses), but appears in some colocation and multi-tenant structures.',
    tags: ['leasing', 'finance']
  },
  {
    front: 'FF&E (Furniture, Fixtures, and Equipment)',
    back: 'Movable assets used in business operations that are NOT permanently attached to the building structure. Important for tax treatment, loan collateral, and acquisition due diligence.\n\n**Examples:** Office furniture, workstations, monitors, kitchen appliances, signage, security cameras, portable generators\n\n**Not FF&E (building improvements):** HVAC systems, electrical wiring, plumbing, built-in cabinetry\n\n**For data centers:** The line between FF&E and building improvements is critical. Racks, cabinets, and cabling may be FF&E; power distribution (PDUs bolted to floor) and cooling infrastructure are typically building improvements.\n\n**Tax treatment:** FF&E generally has shorter depreciation schedules (5-7 years) than building improvements (15-39 years).',
    tags: ['finance', 'accounting', 'development']
  },
  {
    front: 'Forward Sale',
    back: 'A contractual agreement to sell a property at a future date at a price determined today. The buyer commits to purchase the asset upon completion of construction or achievement of specific milestones (e.g., certificate of occupancy, lease-up targets).\n\n**Key features:**\n- Price locked at signing (with possible adjustments for performance)\n- Developer retains development risk until delivery\n- Buyer eliminates construction/entitlement risk but pays a premium\n\n**For data centers:** Forward sales to REITs or institutional investors allow developers to de-risk by securing a buyer before construction begins. The price typically reflects a development spread — the buyer pays a cap rate above what they\'d pay for a fully stabilized asset.',
    tags: ['finance', 'development', 'valuation']
  },
  {
    front: 'Free & Clear Return',
    back: 'The unlevered return on a real estate investment — the return as if the property were purchased with 100% equity and no debt. Equivalent to the capitalization rate or unlevered cash yield.\n\n**Formula:** Free & Clear Return = NOI / Total Property Cost (or Value)\n\n**Why it\'s useful:** Isolates the property\'s operating performance from its capital structure. Allows comparison between properties financed differently. If the free & clear return exceeds the cost of debt, positive leverage exists — meaning adding debt will increase equity returns.\n\n**Synonym:** Also called the "going-in cap rate" when based on purchase price.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Full Service Gross Lease',
    back: 'A lease structure where the landlord pays ALL operating expenses (property taxes, insurance, maintenance, utilities, janitorial) and bundles them into a single gross rent payment from the tenant.\n\n**Tenant pays:** One all-inclusive rent amount\n**Landlord pays:** All operating expenses out of gross rent received\n\n**Often includes an expense stop:** Landlord covers expenses up to a baseline; tenant pays overages above the stop.\n\n**For data centers:** Full service gross leases are rare in data center environments due to the highly variable nature of power costs. Most data center leases are NNN or modified gross with power billed separately based on actual consumption.',
    tags: ['leasing']
  },
  {
    front: 'FFO (Funds From Operations)',
    back: 'A REIT-specific metric of operating performance that adjusts net income by adding back depreciation/amortization of real estate assets and excluding gains/losses from property sales.\n\n**Formula:** FFO = Net Income + Depreciation & Amortization (real estate) − Gains on Property Sales\n\n**Why it exists:** Real estate depreciation is a non-cash charge that often doesn\'t reflect the actual change in property value (buildings appreciate in many markets). FFO provides a more accurate picture of a REIT\'s recurring cash generation.\n\n**AFFO (Adjusted FFO):** Further adjusts for recurring CAPEX and straight-lining of rents, providing an even closer proxy for sustainable distributable cash flow.',
    tags: ['finance', 'valuation', 'equity']
  },
  {
    front: 'Ground Lease',
    back: 'A long-term lease (typically 50-99 years) where the tenant leases the land only and constructs improvements at their own expense. The land remains owned by the ground lessor; improvements revert to the landowner at lease expiration.\n\n**Key features:**\n- Tenant owns the building/improvements during the lease term\n- Ground rent is typically a fixed base with periodic escalations (CPI or fixed %)\n- Subordinated vs. unsubordinated: determines lender priority\n\n**For data centers:** Ground leases are increasingly common for hyperscale campuses. Benefits include lower upfront land cost (no purchase required) and potential tax advantages. Risks include lease expiration, limited control, and financing complexity.',
    tags: ['leasing', 'development', 'legal']
  },
  {
    front: 'Guarantee of Non-Recourse Carve-outs ("Bad Boy" Guarantees)',
    back: 'Personal guarantees by a loan sponsor that are triggered ONLY by specific "bad acts" — converting an otherwise non-recourse loan to full recourse against the guarantor.\n\n**Common carve-out triggers:**\n- Fraud or material misrepresentation\n- Intentional waste of the property\n- Unauthorized transfer or encumbrance\n- Filing voluntary bankruptcy\n- Misapplication of insurance proceeds or tenant deposits\n- Environmental contamination\n\n**Why they exist:** Non-recourse loans limit lender recovery to the property. Carve-outs ensure the borrower doesn\'t abuse this protection through bad behavior. The guarantor is typically the sponsor/principal, and the guarantee is for the full loan amount if triggered.',
    tags: ['finance', 'debt', 'legal']
  },
  {
    front: 'Paid in Arrears',
    back: 'A payment timing convention where payments are made at the END of the period they cover, rather than at the beginning (paid in advance).\n\n**Example:** January\'s interest payment on a loan paid in arrears is due on February 1st (or the first business day of the next period). If paid in advance, it would be due on January 1st.\n\n**Common applications:**\n- Interest on most commercial loans is paid in arrears\n- Operating expenses and utility bills are paid in arrears\n- Rent is typically paid in advance (exception to the pattern)\n\n**Modeling impact:** The timing convention affects cash flow projections and NPV calculations.',
    tags: ['finance', 'debt']
  },
  {
    front: 'Institutional Investor Grade',
    back: 'A designation indicating that a real estate investment meets the quality, size, and risk standards required by institutional investors (pension funds, sovereign wealth funds, insurance companies, large endowments).\n\n**Criteria typically include:**\n- Property value above $25-50M minimum\n- Institutional-quality construction and systems\n- Creditworthy tenants with long-term leases\n- Stable, predictable cash flows\n- Professionally managed\n- Clear title and clean environmental history\n\n**For data centers:** Institutional grade means modern Tier III/IV facilities with hyperscale or investment-grade tenants, long lease terms (10-15+ years), and redundant power/cooling infrastructure.',
    tags: ['finance', 'equity', 'valuation']
  },
  {
    front: 'Land Assemblage',
    back: 'The process of acquiring multiple adjacent or nearby parcels of land from different owners and combining them into a single, larger development site. Often necessary for large-scale projects that require more land than any single parcel provides.\n\n**Challenges:**\n- Holdout owners demanding premium prices\n- Different title issues, easements, and encumbrances per parcel\n- Zoning inconsistencies across parcels\n- Timing risk — partial assemblage may not be viable\n\n**For data centers:** Land assemblage is common for hyperscale campus developments requiring 50-200+ acres. Developers often use option agreements to control parcels while completing the full assemblage, limiting capital at risk.',
    tags: ['development', 'legal']
  },
  {
    front: 'Loan Amortization',
    back: 'The process of repaying a loan through scheduled periodic payments that include both principal and interest, reducing the outstanding balance over time.\n\n**Key concepts:**\n- **Fully amortizing:** Loan is fully repaid by maturity through scheduled payments\n- **Partially amortizing:** Payments reduce principal but a "balloon" balance remains at maturity\n- **Interest-only (I/O):** No principal repayment during I/O period — full balance due later\n\n**Amortization schedule:** Shows the split between principal and interest in each payment. Early payments are mostly interest; later payments are mostly principal.\n\n**For data centers:** Loans often have 2-3 year I/O periods during lease-up, then amortize over 20-30 years with a 7-10 year balloon maturity.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Loan to Cost (LTC)',
    back: 'The ratio of the loan amount to the total development cost of the project. Used by lenders to size construction and development loans.\n\n**Formula:** LTC = Loan Amount / Total Project Cost\n\n**Example:** $140M loan / $200M total project cost = 70% LTC.\n\n**Typical ranges:** 55-75% for data center construction loans, depending on sponsor track record, pre-leasing, and market conditions.\n\n**vs. LTV:** LTC is based on actual costs; LTV is based on appraised market value. For profitable developments, LTV < LTC because the property is worth more than it costs to build (development spread). LTC is the primary sizing metric during construction; LTV becomes primary for permanent financing.',
    tags: ['finance', 'debt', 'development']
  },
  {
    front: 'Lock-out Period',
    back: 'A period after loan closing during which the borrower is prohibited from prepaying the loan, regardless of penalty. No prepayment option exists during this window.\n\n**Typical duration:** 1-5 years for commercial real estate loans.\n\n**After lock-out expires:** Borrower may prepay subject to a penalty mechanism (yield maintenance, defeasance, or declining percentage penalty).\n\n**Why lenders require it:** Protects the lender\'s expected yield and return of capital. Particularly important for CMBS lenders who have sold bonds to investors based on expected cash flow duration.\n\n**For borrowers:** Lock-out periods limit flexibility to refinance, sell, or restructure. Negotiating shorter lock-outs is a key loan term to watch.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Mezzanine Debt',
    back: 'Subordinated debt that sits between senior debt and equity in the capital stack. Secured by a pledge of the borrower\'s equity interests (ownership) in the property-owning entity, NOT by a mortgage on the property itself.\n\n**Key features:**\n- Higher interest rate than senior debt (typically 8-15%)\n- Subordinate to senior lender in payment priority\n- Secured by equity pledge (lender can take over ownership via UCC foreclosure)\n- Allows higher total leverage (e.g., 75% senior + 10% mezz = 85% total)\n\n**For data centers:** Mezzanine fills the gap when a sponsor wants higher leverage than senior lenders will provide. The total blended cost of debt increases, so project returns must justify the additional leverage.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Mileage Rate',
    back: 'In CRE context, the cost per unit distance for extending utility infrastructure (power, water, fiber, sewer) to a development site. Critical for data center site selection where utility proximity directly impacts development costs.\n\n**Example:** Power line extension at $1.5M per mile × 3 miles = $4.5M infrastructure cost.\n\n**Considerations for data centers:**\n- High-voltage transmission line extensions: $1-5M+ per mile\n- Fiber optic conduit: $20-50K per mile (rural) to $200K+ per mile (urban)\n- Water/sewer: $500K-2M per mile depending on terrain\n\nMileage costs can make or break a site\'s financial viability and must be included in total project CAPEX.',
    tags: ['development', 'finance']
  },
  {
    front: 'Mortgage Constant',
    back: 'The annual debt service (principal + interest) expressed as a percentage of the original loan amount. It represents the total cost of borrowing per dollar of loan.\n\n**Formula:** Mortgage Constant = Annual Debt Service / Original Loan Amount\n\n**Example:** $10M annual debt service / $125M loan = 8.0% mortgage constant.\n\n**Key relationship to cap rate:** If the mortgage constant EXCEEDS the cap rate, the property has negative leverage — debt service consumes more income proportionally than the property earns. If the cap rate exceeds the mortgage constant, positive leverage exists.\n\n**Includes both principal and interest**, unlike the interest rate alone.',
    tags: ['finance', 'debt', 'valuation']
  },
  {
    front: 'Net Lease vs Triple Net (NNN) vs Single Net vs Double Net Lease',
    back: '**Single Net (N):** Tenant pays rent + property taxes. Landlord pays insurance and maintenance.\n\n**Double Net (NN):** Tenant pays rent + property taxes + insurance. Landlord pays maintenance/structural repairs.\n\n**Triple Net (NNN):** Tenant pays rent + property taxes + insurance + ALL maintenance and operating expenses. Landlord receives "net" rent with minimal responsibilities.\n\n**Absolute NNN / Bondable:** Tenant responsible for EVERYTHING including roof and structural repairs. Landlord has zero obligations.\n\n**For data centers:** Most single-tenant data center leases are NNN or absolute NNN, with the tenant responsible for all operating costs. This makes the landlord\'s income stream predictable and bond-like, supporting lower cap rates and easier financing.',
    tags: ['leasing']
  },
  {
    front: 'Net Present Value (NPV)',
    back: 'The difference between the present value of all future cash inflows and the present value of all cash outflows, discounted at the required rate of return.\n\n**Formula:** NPV = Σ [CFₜ / (1+r)ᵗ] − Initial Investment\n\n**Decision rule:**\n- NPV > 0: Investment creates value (accept)\n- NPV = 0: Investment earns exactly the required return\n- NPV < 0: Investment destroys value (reject)\n\n**For data centers:** NPV is used to evaluate development opportunities, compare expansion alternatives, and assess acquisition pricing. A positive NPV means the project earns more than the investor\'s required return (discount rate).\n\n**vs. IRR:** NPV gives an absolute dollar value; IRR gives a percentage return.',
    tags: ['finance', 'valuation']
  },
  {
    front: 'Option Agreement',
    back: 'A contract giving a potential buyer the exclusive right (but not the obligation) to purchase a property at a predetermined price within a specified time period, in exchange for an option payment (option consideration).\n\n**Key features:**\n- Option fee is typically non-refundable but credited toward purchase price if exercised\n- Buyer controls the property without full financial commitment\n- Seller cannot sell to others during the option period\n\n**For data centers:** Options are critical for land assemblage and site control during the entitlement process. A developer might option 100 acres for $500K while spending 12-18 months securing power commitments and zoning approvals, only exercising (purchasing) if all entitlements are obtained.',
    tags: ['legal', 'development']
  },
  {
    front: 'Owner Controlled Insurance Program (OCIP)',
    back: 'A "wrap-up" insurance policy purchased by the property owner/developer that provides coverage for ALL contractors and subcontractors working on a construction project under a single policy.\n\n**Advantages:**\n- Lower total premium (volume purchasing, single policy)\n- Uniform coverage — no gaps between contractor policies\n- Owner controls the insurance program and claims\n- Eliminates duplicate coverage costs\n- Easier claim management\n\n**Covers:** General liability, workers\' compensation, excess/umbrella liability for all enrolled parties.\n\n**For data centers:** OCIPs are common on large construction projects ($50M+) where multiple contractors work simultaneously. The cost savings can be 1-3% of total construction costs.',
    tags: ['development', 'legal']
  },
  {
    front: 'Pari Passu',
    back: 'Latin for "on equal footing." In finance, it means two or more loans, securities, or investors rank equally in priority — no one has preference over another in terms of payment, collateral claims, or rights.\n\n**Common uses:**\n- **Debt:** Two tranches of debt ranking pari passu share collateral proceeds proportionally in default\n- **Equity:** Co-investors contributing capital pari passu invest on the same terms and receive returns proportionally\n- **Joint ventures:** Pari passu partners share profits, losses, and governance equally\n\n**Opposite:** Senior/subordinate — where one party has priority over another.',
    tags: ['finance', 'legal']
  },
  {
    front: 'Permanent Financing',
    back: 'Long-term debt secured against a completed, stabilized property that replaces short-term construction or bridge financing. Also called a "takeout" loan.\n\n**Key features:**\n- Longer term (5-25 years, sometimes 30+)\n- Lower interest rate than construction/bridge loans\n- Amortizing principal payments (typically 25-30 year schedule)\n- Sized on stabilized NOI, DSCR, LTV, and debt yield\n\n**Sources:** Life insurance companies, CMBS, banks, agency lenders, debt funds\n\n**For data centers:** Permanent financing requires demonstrated stabilization (typically 85-95% leased). The transition from construction to permanent financing is a critical milestone — inability to secure perm financing is a significant project risk.',
    tags: ['finance', 'debt', 'lending']
  },
  {
    front: 'Preferred Return',
    back: 'The minimum annual return that limited partners (LPs) must receive before the general partner (GP) participates in any profit sharing (promote). It\'s a hurdle rate that protects LP returns.\n\n**Typical range:** 6-10% annually (8% is common in US CRE private equity)\n\n**How it works:** LPs receive 100% of distributions until they\'ve received their full preferred return (often compounded). Only after the pref hurdle is met does the GP begin to receive its promote/carried interest.\n\n**Cumulative vs. non-cumulative:** Cumulative preferred returns accrue if unpaid — the LP must receive ALL accrued preferreds before the GP earns promote. Non-cumulative preferreds do not carry forward.',
    tags: ['finance', 'equity']
  },
  {
    front: 'Promote (Carried Interest)',
    back: 'The disproportionate share of profits received by the general partner (GP) after limited partners (LPs) have received their preferred return. It\'s the GP\'s performance-based compensation.\n\n**Typical structure (waterfall):**\n1. Return of capital to all partners\n2. Preferred return to LPs (e.g., 8%)\n3. GP catch-up (GP receives 100% until it has its promote share)\n4. Remaining profits split (e.g., 80% LP / 20% GP)\n\n**Example:** The GP contributes 10% of equity but receives 20% of profits above the pref = disproportionate "promote" of 10%.\n\n**Tax treatment:** Historically taxed as long-term capital gains (carried interest), though subject to ongoing legislative debate.',
    tags: ['finance', 'equity']
  },
  {
    front: 'Purchase and Sale Agreement (PSA)',
    back: 'The binding contract between buyer and seller that governs a real estate transaction. It sets forth all terms and conditions of the sale.\n\n**Key provisions:**\n- Purchase price and payment terms\n- Earnest money deposit amount and timing\n- Due diligence period and scope\n- Representations and warranties\n- Closing conditions and timeline\n- Title and survey requirements\n- Environmental provisions\n- Default remedies (specific performance, liquidated damages)\n\n**For data centers:** PSAs for operating data centers include additional provisions for tenant estoppels, equipment inventories, power/utility contracts, and service level agreements that must be assigned or assumed.',
    tags: ['legal', 'development']
  },
  {
    front: 'Ratio Utility Billing System (RUBS)',
    back: 'A method of allocating utility costs to tenants in a multi-tenant building based on a formula (typically square footage, occupancy, or number of units) rather than individual metering.\n\n**How it works:** Total utility bill is divided among tenants using a predetermined ratio or formula. No individual meters required.\n\n**Advantages:** Lower implementation cost than individual metering, recovers utility costs from tenants.\n**Disadvantages:** Less accurate, no incentive for individual conservation, potential tenant disputes.\n\n**For data centers:** RUBS is uncommon in data centers where power costs are the dominant operating expense. Most data center leases require individual power metering at the cabinet, cage, or suite level for accurate billing.',
    tags: ['leasing', 'finance']
  },
  {
    front: 'Real Estate Private Equity (REPE) vs REIT',
    back: '**REPE (Real Estate Private Equity):**\n- Closed-end funds with fixed investment period (3-5 years) and hold period (5-10 years)\n- High minimum investment ($250K-$10M+)\n- Illiquid — capital locked up for fund life\n- Higher target returns (15-25% IRR) through value-add/opportunistic strategies\n- GP/LP structure with promote\n\n**REIT (Real Estate Investment Trust):**\n- Publicly traded (or private) companies owning income-producing real estate\n- Liquid — shares trade on stock exchanges\n- Must distribute 90%+ of taxable income as dividends\n- Lower target returns (8-12%) from core/core-plus strategies\n- Tax-advantaged pass-through structure\n\n**Data center REITs:** Equinix, Digital Realty, QTS (now Blackstone) are major examples.',
    tags: ['finance', 'equity']
  },
  {
    front: 'Residual Land Value Analysis',
    back: 'A development feasibility method that calculates the maximum price a developer can pay for land by working backwards from the completed project\'s value.\n\n**Formula:** Residual Land Value = Completed Project Value − (Construction Costs + Soft Costs + Financing Costs + Developer Profit)\n\n**Example:** Completed data center worth $300M − $220M all-in costs − $30M developer profit = $50M maximum land value.\n\n**Why it matters:** If the residual land value exceeds the asking price, the development is feasible. If it\'s below the asking price, the land is too expensive for the intended use.\n\n**For data centers:** Power availability and utility infrastructure costs dramatically affect residual land values. A site with available substation capacity may have far higher residual value than a remote site requiring utility extension.',
    tags: ['development', 'valuation']
  },
  {
    front: 'Sale Leaseback',
    back: 'A transaction where a property owner sells the asset and simultaneously leases it back from the buyer, becoming the tenant. The seller/tenant retains use of the property while converting real estate equity to cash.\n\n**Benefits for seller/tenant:**\n- Unlocks capital tied up in real estate\n- Converts owned asset to operating expense (off-balance-sheet in some cases)\n- Maintains operational control and use of the facility\n\n**Benefits for buyer/landlord:**\n- Acquires stabilized, occupied property with creditworthy tenant\n- Long-term lease (typically 15-25 years) with built-in escalations\n\n**For data centers:** Hyperscalers and enterprises use sale-leasebacks to redeploy capital from owned facilities into core business operations while maintaining data center access.',
    tags: ['finance', 'leasing', 'equity']
  },
  {
    front: 'Specific Performance',
    back: 'A legal remedy in which a court orders a breaching party to fulfill their contractual obligations (typically to complete a real estate sale) rather than simply paying monetary damages.\n\n**When it applies:** Real estate is considered "unique" under law — no two properties are identical. Therefore, monetary damages may not adequately compensate a buyer who contracted to purchase a specific property. The court can force the seller to complete the sale.\n\n**PSA context:** Purchase agreements typically include specific performance clauses. A buyer may have the right to sue for specific performance if the seller refuses to close. Conversely, sellers sometimes have specific performance rights to compel a buyer to close.\n\n**Practical reality:** Courts grant specific performance sparingly. Most disputes settle or result in monetary damages.',
    tags: ['legal']
  },
  {
    front: 'Sponsor',
    back: 'The individual, company, or group that initiates, develops, and manages a real estate investment project. The sponsor is typically the general partner (GP) who:\n\n- Identifies and sources the investment opportunity\n- Arranges financing (debt and equity)\n- Manages development or operations\n- Makes key business decisions\n- Contributes a portion of equity (typically 5-20%)\n- Earns fees (acquisition, development, management) and promote\n\n**Lender perspective:** The sponsor\'s track record, net worth, and liquidity are critical underwriting factors. Lenders evaluate "sponsorship risk" — the probability the sponsor can execute the business plan.\n\n**For data centers:** Experienced data center sponsors command better financing terms due to the specialized nature of the asset class.',
    tags: ['finance', 'equity', 'development']
  },
  {
    front: 'Stress Test',
    back: 'A financial modeling exercise that subjects the project\'s cash flows and returns to extreme but plausible adverse scenarios to assess resilience and identify breaking points.\n\n**Common stress scenarios for data centers:**\n- Construction cost overruns (+15-25%)\n- Delayed lease-up (6-18 months behind plan)\n- Tenant default / early termination\n- Interest rate increase (+200-300 bps)\n- Power cost escalation beyond contract terms\n- Lower exit cap rate than underwritten\n\n**Key outputs:** Minimum DSCR under stress, break-even occupancy, maximum interest rate before covenant breach, NPV sensitivity.\n\n**Purpose:** Ensures the project can survive adverse conditions and identifies which risks are most dangerous to returns and debt coverage.',
    tags: ['finance', 'modeling']
  },
  {
    front: 'Temporary Certificate of Occupancy (TCO)',
    back: 'A document issued by the local building authority permitting partial or conditional occupancy of a building before all construction work is complete and final inspections are passed.\n\n**Key features:**\n- Limited duration (typically 60-180 days, renewable)\n- May restrict occupancy to certain areas/floors\n- Outstanding punch list items must not affect life safety\n- Fire protection, egress, and structural systems must be complete\n\n**For data centers:** TCOs are common during phased deliveries. A developer may obtain a TCO for Phase 1 (50MW) while Phase 2 is still under construction. Tenants can begin installation and operations in completed areas. The permanent Certificate of Occupancy (CO) is issued when all work is 100% complete.',
    tags: ['development', 'legal']
  },
  {
    front: 'Tenant Estoppel Certificate',
    back: 'A signed document from a tenant confirming key facts about their lease, typically requested during a property sale or refinancing. The tenant certifies the accuracy of lease terms and their current status.\n\n**Typically confirms:**\n- Lease commencement and expiration dates\n- Current rent and scheduled escalations\n- Security deposit amount held by landlord\n- No outstanding landlord defaults or tenant claims\n- No prepaid rent beyond the current period\n- Lease has not been modified (or lists modifications)\n\n**Why it matters:** Buyers and lenders rely on estoppels to verify the income stream. A tenant cannot later claim different lease terms than those certified. Failure to obtain estoppels can delay or derail a sale.',
    tags: ['leasing', 'legal']
  },
  {
    front: 'Title Insurance',
    back: 'An insurance policy that protects a property owner or lender against financial losses arising from defects in the title (ownership) of real property that were not discovered during the title search.\n\n**Two types:**\n- **Owner\'s policy:** Protects the buyer\'s ownership interest (one-time premium at closing)\n- **Lender\'s policy:** Protects the lender\'s mortgage interest (required by most lenders)\n\n**Covers:** Undisclosed liens, forged documents, recording errors, undisclosed heirs, boundary disputes, easement issues\n\n**Unique feature:** Unlike most insurance (which covers future events), title insurance covers PAST events that affect current ownership rights. Premium is a one-time payment at closing.',
    tags: ['legal', 'finance']
  },
  {
    front: 'Trailing Twelve Months (TTM / T-12)',
    back: 'Financial data covering the most recent 12-month period, used to evaluate current operating performance without waiting for fiscal year-end reporting.\n\n**Example:** A T-12 report as of March 2026 covers April 2025 through March 2026.\n\n**Why it\'s used:**\n- More current than last fiscal year\'s annual report\n- Captures seasonal patterns across a full year cycle\n- Standard for CRE underwriting and valuation\n\n**For data centers:** T-12 financials show actual revenue, operating expenses, and NOI. Buyers and lenders compare T-12 actual performance to the seller\'s proforma projections. Discrepancies between T-12 actuals and proforma are red flags during due diligence.',
    tags: ['finance', 'accounting', 'valuation']
  },
  {
    front: 'Wrap-Up Insurance (CCIP/OCIP)',
    back: 'A consolidated insurance program for construction projects that provides coverage for the owner (OCIP — Owner Controlled Insurance Program) or contractor (CCIP — Contractor Controlled Insurance Program) and all enrolled parties under a single policy.\n\n**Coverage includes:** General liability, workers\' compensation, excess/umbrella, and sometimes builder\'s risk and professional liability.\n\n**Benefits:**\n- Volume discount on premiums (20-40% savings vs. individual policies)\n- Eliminates coverage gaps between contractor policies\n- Single point of claims management\n- Extended completed operations coverage (typically 3-10 years post-completion)\n\n**Threshold:** Typically used on projects exceeding $50-100M in construction costs.',
    tags: ['development', 'legal']
  },
  {
    front: 'Commensurate',
    back: 'In finance and CRE, "commensurate" means proportional or corresponding in degree. Most commonly used in the context of risk-adjusted returns — investors expect returns commensurate with the level of risk assumed.\n\n**Examples:**\n- "The preferred return should be commensurate with the risk profile of the investment"\n- "Mezzanine debt carries interest rates commensurate with its subordinated position"\n- "Sponsor promote is commensurate with the value they add to the project"\n\n**Key principle:** In efficient markets, higher risk should produce higher returns. An investment offering returns that are NOT commensurate with its risk is either a bargain (underpriced risk) or a trap (undisclosed risk).',
    tags: ['finance']
  },
  {
    front: 'Pro Rata',
    back: 'Latin for "in proportion." Refers to the allocation of costs, revenue, ownership, or obligations proportionally based on each party\'s share or participation.\n\n**Common CRE applications:**\n- **Debt drawdown:** Construction loan and equity drawn pro rata per their funding percentages\n- **Expense sharing:** Multi-tenant operating expenses allocated pro rata by square footage or MW\n- **Ownership distributions:** Cash flow distributed pro rata to equity investors based on ownership percentage\n- **Insurance premiums:** Allocated pro rata to enrolled contractors based on contract value\n\n**Example:** A 30% equity partner in a JV receives 30% of distributions, contributes 30% of capital calls, and bears 30% of losses (all pro rata).',
    tags: ['finance', 'legal']
  }
];

async function main() {
  console.log('Creating card set under existing A.CRE topic:', TOPIC_ID);

  const cardSet = await post('/api/topics/' + TOPIC_ID + '/sets', {
    name: 'CRE Finance & Investment Terms',
    description: 'Comprehensive CRE finance and investment vocabulary covering debt structures, equity metrics, valuation methods, leasing terms, and legal concepts essential for data center development professionals.'
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
  console.log('Done! Created', created, 'flashcards in card set "CRE Finance & Investment Terms"');
}

main().catch(e => console.error('Error:', e));
