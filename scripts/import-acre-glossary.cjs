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
    front: '1031 Exchange',
    back: 'A tax-deferral strategy under IRC Section 1031 that allows an investor to sell a property and reinvest the proceeds into a "like-kind" replacement property, deferring capital gains taxes indefinitely.\n\n**Key rules:**\n- 45-day identification period to name replacement properties\n- 180-day closing deadline\n- Must use a Qualified Intermediary (QI) to hold funds\n- "Like-kind" is broadly defined for real estate (any real property for any real property)\n- Boot (cash or non-like-kind property received) is taxable\n\n**Data center relevance:** Investors frequently use 1031 exchanges when rotating out of stabilized assets into development-stage or higher-yield properties.',
    tags: ['investment', 'tax', 'disposition']
  },
  {
    front: 'Net Absorption vs. Gross Absorption',
    back: '**Gross Absorption:** Total square footage leased during a period, regardless of space vacated.\n\n**Net Absorption:** Total square footage leased minus total square footage vacated during the same period.\n\n**Formula:** Net Absorption = New Leases + Expansions − Vacated Space\n\n**Why it matters:** Net absorption is the true demand indicator. Positive net absorption signals a tightening market (demand > supply). Negative net absorption signals oversupply.\n\n**Data center context:** Tracked in MW rather than SF. Positive net absorption in a market like Northern Virginia signals strong demand for powered shell or turnkey capacity.',
    tags: ['leasing', 'market-analysis']
  },
  {
    front: 'Adaptive Reuse',
    back: 'The process of repurposing an existing building for a use different from its original design — e.g., converting a warehouse into apartments, or a retail mall into a data center.\n\n**Advantages:**\n- Often faster entitlement process than ground-up\n- May qualify for historic tax credits\n- Lower demolition/site prep costs\n- Community goodwill from preserving structures\n\n**Risks:**\n- Structural limitations, environmental remediation\n- Zoning changes may be required\n- Higher per-SF renovation costs than new construction\n\n**Data center relevance:** Former big-box retail, manufacturing plants, and power stations are increasingly converted to data center use due to existing power infrastructure and large floor plates.',
    tags: ['development', 'strategy']
  },
  {
    front: 'Adjusted Funds from Operations (AFFO)',
    back: 'A refinement of FFO that deducts recurring capital expenditures (maintenance capex) and straight-line rent adjustments to better approximate the cash available for distribution to shareholders.\n\n**Formula:** AFFO = FFO − Recurring CapEx − Straight-Line Rent Adjustments\n\n**Why it matters:** Considered a more accurate measure of a REIT\'s sustainable dividend-paying capacity than FFO, because FFO ignores the capital needed to maintain existing assets.\n\n**Data center REIT examples:** Digital Realty (DLR), Equinix (EQIX) report AFFO per share as a key metric for investors.',
    tags: ['valuation', 'equity', 'REIT']
  },
  {
    front: 'Capitalization Rate (Cap Rate)',
    back: 'The ratio of a property\'s Net Operating Income (NOI) to its current market value or purchase price. It represents the unleveraged yield an investor would receive.\n\n**Formula:** Cap Rate = NOI / Property Value\n**Or rearranged:** Value = NOI / Cap Rate\n\n**Key concepts:**\n- Lower cap rate = higher price relative to income (lower risk / higher demand)\n- Higher cap rate = lower price relative to income (higher risk / less demand)\n- Does NOT account for financing, capital expenditures, or appreciation\n\n**Typical ranges:**\n- Core data centers: 4.5%–6.0%\n- Value-add: 6.0%–8.0%\n- Opportunistic/development: 8.0%+\n\n**Critical distinction:** Cap rate is a point-in-time snapshot, not a total return measure.',
    tags: ['valuation', 'investment']
  },
  {
    front: 'Cash-on-Cash Return (CoC)',
    back: 'The ratio of annual pre-tax cash flow to the total equity invested. Measures the cash income earned on the cash invested.\n\n**Formula:** CoC = Annual Pre-Tax Cash Flow / Total Equity Invested\n\n**Key differences from other metrics:**\n- Unlike Cap Rate: accounts for financing (leverage)\n- Unlike IRR: ignores time value of money and exit proceeds\n- Unlike Equity Multiple: single-year snapshot, not cumulative\n\n**Example:** $500K annual cash flow on $5M equity = 10% CoC return\n\n**Use case:** Quick gut-check on whether a deal\'s current cash flow justifies the equity commitment. Common LP reporting metric.',
    tags: ['investment', 'equity', 'returns']
  },
  {
    front: 'Net Operating Income (NOI)',
    back: 'The income a property generates after deducting all operating expenses but before debt service, capital expenditures, depreciation, and income taxes.\n\n**Formula:** NOI = Effective Gross Income − Operating Expenses\n\n**Includes in operating expenses:**\n- Property taxes, insurance, utilities\n- Property management fees\n- Repairs & maintenance\n- CAM / common area costs\n\n**Excludes:**\n- Debt service (mortgage payments)\n- Capital expenditures\n- Depreciation & amortization\n- Income taxes\n\n**Why it\'s critical:** NOI is the numerator in cap rate calculations and the basis for virtually all CRE valuation. It isolates property-level performance from financing and tax decisions.',
    tags: ['valuation', 'investment', 'fundamentals']
  },
  {
    front: 'Internal Rate of Return (IRR)',
    back: 'The discount rate at which the Net Present Value (NPV) of all cash flows (both inflows and outflows) equals zero. It represents the annualized rate of return an investment is expected to generate.\n\n**Key characteristics:**\n- Accounts for time value of money\n- Sensitive to timing of cash flows (early returns boost IRR)\n- Can be levered (equity IRR) or unlevered (property-level IRR)\n- Multiple IRR solutions possible with non-conventional cash flows\n\n**Typical CRE targets:**\n- Core: 8%–12%\n- Value-add: 12%–18%\n- Opportunistic/development: 18%–25%+\n\n**Limitation:** Assumes interim cash flows are reinvested at the IRR itself, which may be unrealistic for high IRR deals.',
    tags: ['investment', 'returns', 'valuation']
  },
  {
    front: 'Net Present Value (NPV)',
    back: 'The sum of all future cash flows discounted back to present value at a specified discount rate, minus the initial investment.\n\n**Formula:** NPV = Σ [CF_t / (1 + r)^t] − Initial Investment\n\n**Decision rule:**\n- NPV > 0: Investment exceeds the required return → proceed\n- NPV = 0: Investment exactly meets the required return\n- NPV < 0: Investment falls short of the required return → pass\n\n**Advantage over IRR:** NPV gives a dollar amount of value created, not just a percentage. It correctly handles mutually exclusive projects of different sizes.\n\n**Discount rate selection:** Typically the investor\'s weighted average cost of capital (WACC) or required rate of return.',
    tags: ['investment', 'returns', 'valuation']
  },
  {
    front: 'Discounted Cash Flow (DCF) Analysis',
    back: 'A valuation method that projects a property\'s future cash flows over a holding period and discounts them to present value to determine what the investment is worth today.\n\n**Components:**\n1. **Projection period:** Typically 5–10 years of annual cash flows\n2. **Terminal/reversion value:** Sale price at end of hold (NOI_exit / Exit Cap Rate)\n3. **Discount rate:** Investor\'s required rate of return\n\n**Steps:**\n1. Project NOI for each year\n2. Subtract debt service for levered analysis\n3. Add terminal value in final year\n4. Discount all cash flows to present at the discount rate\n5. Sum = DCF value\n\n**Strengths:** Captures growth, lease rollovers, capex timing\n**Weakness:** Highly sensitive to assumptions (exit cap, growth rate, discount rate)',
    tags: ['valuation', 'investment']
  },
  {
    front: 'Equity Multiple (EM)',
    back: 'The total cash distributions received from an investment divided by the total equity invested. Measures how many times you get your money back.\n\n**Formula:** EM = Total Distributions / Total Equity Invested\n\n**Interpretation:**\n- EM of 2.0x = investor doubled their money\n- EM of 1.5x = 50% total profit on equity\n- EM < 1.0x = loss of capital\n\n**Key distinction from IRR:** Equity Multiple ignores timing. A 2.0x return in 3 years is far better than 2.0x in 10 years, but both show the same EM.\n\n**Best practice:** Always evaluate EM alongside IRR. High IRR + low EM can mean a small, quick profit. Low IRR + high EM can mean a large but slow profit.',
    tags: ['investment', 'equity', 'returns']
  },
  {
    front: 'Debt Yield',
    back: 'The ratio of a property\'s NOI to the total loan amount. Measures the lender\'s return if they had to take ownership of the property.\n\n**Formula:** Debt Yield = NOI / Loan Amount\n\n**Why lenders use it:**\n- Unlike DSCR, it\'s independent of interest rate and amortization\n- Unlike LTV, it\'s independent of appraised value\n- Provides a pure measure of the loan\'s risk relative to property income\n\n**Typical thresholds:**\n- Minimum 8%–10% for conventional CRE loans\n- CMBS lenders may require 10%+\n\n**Example:** $2M NOI / $20M loan = 10% debt yield\n\nHigher debt yield = more cushion for the lender.',
    tags: ['debt', 'lending', 'valuation']
  },
  {
    front: 'Loan-to-Value Ratio (LTV)',
    back: 'The ratio of the mortgage loan amount to the appraised value of the property. Measures leverage and lender risk exposure.\n\n**Formula:** LTV = Loan Amount / Appraised Property Value\n\n**Typical CRE ranges:**\n- Stabilized: 60%–75% LTV\n- Construction: 50%–65% LTC (Loan-to-Cost)\n- CMBS: up to 75%\n- Agency multifamily: up to 80%\n\n**Key implications:**\n- Higher LTV = more leverage = higher equity returns but more risk\n- Lenders set maximum LTV based on property type, sponsor strength, and market\n- LTV covenants in loan docs can trigger cash sweeps or events of default if violated\n\n**Limitation:** Dependent on appraised value, which can be subjective.',
    tags: ['debt', 'lending', 'investment']
  },
  {
    front: 'Debt Service Coverage Ratio (DSCR)',
    back: 'The ratio of NOI to annual debt service (principal + interest payments). Measures a property\'s ability to cover its mortgage payments.\n\n**Formula:** DSCR = NOI / Annual Debt Service\n\n**Interpretation:**\n- DSCR > 1.0x: Property generates enough income to cover debt\n- DSCR = 1.0x: Breakeven — no margin of safety\n- DSCR < 1.0x: Property cannot cover debt from operations\n\n**Typical lender requirements:**\n- Minimum 1.20x–1.35x for conventional loans\n- 1.25x is the most common threshold\n\n**Example:** $2M NOI / $1.5M debt service = 1.33x DSCR\n\n**Loan docs often include:** DSCR covenants requiring ongoing compliance, with cash sweeps triggered if DSCR falls below threshold.',
    tags: ['debt', 'lending']
  },
  {
    front: 'Preferred Return (Pref)',
    back: 'A priority return paid to investors (typically LPs) before the sponsor/GP receives any profit participation (promote). It functions as a minimum return hurdle.\n\n**Typical range:** 6%–10% annually (8% is most common)\n\n**Structures:**\n- **Cumulative:** Unpaid pref accrues and must be paid before GP participates\n- **Non-cumulative:** Unpaid pref does not carry forward\n- **Compounding:** Unpaid pref earns interest on itself\n\n**Waterfall position:** Pref is typically the first return tier:\n1. Return of capital to LPs\n2. Preferred return to LPs\n3. GP catch-up (if applicable)\n4. Remaining profits split per promote structure\n\n**Key for LPs:** The pref protects downside — it ensures the sponsor doesn\'t profit until investors receive a baseline return.',
    tags: ['equity', 'investment', 'waterfall']
  },
  {
    front: 'Promote / Carried Interest',
    back: 'The disproportionate share of profits that the General Partner (GP/sponsor) earns above their pro-rata ownership stake, after the preferred return and other waterfall hurdles are met.\n\n**Example:** GP contributes 10% of equity but earns 20%–30% of profits above the pref hurdle.\n\n**Typical promote structures:**\n- Above 8% pref: 80/20 split (80% LP, 20% GP)\n- Above 12% IRR: 70/30 split\n- Above 15% IRR: 60/40 or 50/50 split\n\n**Why it exists:** Aligns GP incentives with LP returns — the GP only earns outsized compensation by delivering outsized performance.\n\n**Tax treatment:** Historically taxed as capital gains (carried interest), though subject to ongoing legislative scrutiny.',
    tags: ['equity', 'investment', 'waterfall']
  },
  {
    front: 'General Partner (GP) vs. Limited Partner (LP)',
    back: '**General Partner (GP):**\n- The sponsor/operator who manages the investment\n- Has unlimited liability (in a general partnership) or manages the fund/deal\n- Makes all operating decisions: acquisitions, dispositions, leasing, financing\n- Contributes a small share of equity (typically 5%–20%)\n- Earns management fees + promote/carried interest\n\n**Limited Partner (LP):**\n- Passive investor who contributes capital\n- Limited liability (can only lose what they invest)\n- No management authority or decision-making power\n- Receives preferred return + pro-rata share of profits\n- Often institutional: pension funds, endowments, family offices, HNW individuals\n\n**Structure:** Most CRE investments use an LLC or LP structure with these roles defined in the Operating Agreement or LPA.',
    tags: ['equity', 'investment', 'structure']
  },
  {
    front: 'Waterfall Distribution',
    back: 'A tiered structure that defines the order and percentages in which cash flows are distributed between GP and LP investors.\n\n**Standard 4-tier waterfall:**\n1. **Return of Capital:** LPs receive their invested capital back first\n2. **Preferred Return:** LPs receive their preferred return (e.g., 8% annual)\n3. **GP Catch-Up:** GP receives distributions until they "catch up" to their promote percentage of all profits distributed so far\n4. **Residual Split:** Remaining profits split between GP and LP per the promote schedule (e.g., 70/30, then 60/40 above higher IRR hurdles)\n\n**American vs. European style:**\n- American: Distributions calculated deal-by-deal\n- European: Distributions calculated across entire fund portfolio — GP doesn\'t promote until all LP capital + pref is returned across ALL deals',
    tags: ['equity', 'investment', 'waterfall']
  },
  {
    front: 'American-style vs. European-style Waterfall',
    back: '**American-style (Deal-by-Deal):**\n- GP earns promote on each individual deal as it is realized\n- GP can receive promote even if other deals in the fund are underperforming\n- More GP-friendly; more common in U.S. real estate funds\n- Risk: GP may receive promote that later needs to be "clawed back"\n\n**European-style (Whole Fund):**\n- GP earns promote only after ALL invested capital + preferred return has been returned across the entire fund\n- LPs are fully repaid before GP participates in any promote\n- More LP-friendly; common in European PE and some institutional U.S. funds\n- Clawback risk is minimal since GP promote is back-ended\n\n**Hybrid approaches:** Some funds use deal-by-deal with escrow holdbacks to approximate European-style LP protection.',
    tags: ['equity', 'investment', 'waterfall']
  },
  {
    front: 'Going-in Cap Rate vs. Exit Cap Rate',
    back: '**Going-in Cap Rate:**\n- Cap rate at acquisition based on Year 1 NOI / Purchase Price\n- Reflects what you\'re paying for the property\'s current income stream\n- Lower going-in cap = higher price paid\n\n**Exit Cap Rate:**\n- Assumed cap rate at disposition, used to estimate sale price\n- Sale Price = Projected NOI at Exit / Exit Cap Rate\n- Typically modeled 50–100 bps higher than going-in cap (conservative assumption that market may soften)\n\n**Spread matters:** The difference between going-in and exit cap rates significantly impacts IRR. Tightening caps (exit < going-in) boost returns; expanding caps erode them.\n\n**Common mistake:** Using the same cap rate for entry and exit — this ignores market cycle risk and building age/obsolescence.',
    tags: ['valuation', 'investment']
  },
  {
    front: 'Yield on Cost (YoC)',
    back: 'The ratio of a property\'s stabilized NOI to the total development cost. Used to evaluate whether a development project creates value compared to buying an equivalent stabilized asset.\n\n**Formula:** YoC = Stabilized NOI / Total Development Cost\n\n**Decision framework:**\n- If YoC > Market Cap Rate → development creates value (you\'re "building to a higher yield")\n- If YoC < Market Cap Rate → better to buy stabilized\n\n**Example:**\n- Stabilized NOI: $5M\n- Total cost: $50M\n- YoC = 10%\n- Market cap rate: 6%\n- Implied value: $5M / 6% = $83.3M → $33.3M of value created\n\n**Data center relevance:** The development spread (YoC minus market cap rate) is a primary driver of data center development decisions.',
    tags: ['development', 'valuation', 'investment']
  },
  {
    front: 'Development Spread',
    back: 'The difference between Yield on Cost and the prevailing market cap rate for a comparable stabilized asset. It quantifies the value created through development.\n\n**Formula:** Development Spread = Yield on Cost − Market Cap Rate\n\n**Interpretation:**\n- Positive spread = development creates value above acquisition cost\n- Larger spread = more profit margin / risk cushion\n- Typical target: 150–250+ bps of spread\n\n**Example:**\n- YoC = 9.0%, Market Cap = 6.0% → 300 bps spread\n- Total cost = $50M, Stabilized NOI = $4.5M\n- Implied stabilized value = $4.5M / 6.0% = $75M\n- Value created = $25M (50% margin on cost)\n\n**Risk:** The spread must be wide enough to compensate for development risk: entitlement delays, construction cost overruns, lease-up risk, and interest rate changes.',
    tags: ['development', 'valuation']
  },
  {
    front: 'Stabilized NOI',
    back: 'The Net Operating Income a property is expected to generate once it reaches a stabilized occupancy level (typically 90%–95%) and is operating under normal market conditions.\n\n**Why it matters:**\n- Used as the basis for permanent loan sizing\n- Used with cap rate to determine stabilized value\n- Differentiates from "in-place" NOI which may reflect lease-up or vacancy\n\n**Calculating stabilized NOI:**\n1. Start with market rents at stabilized occupancy\n2. Deduct vacancy & credit loss (typically 5%–10%)\n3. Add other income (parking, storage, antenna)\n4. Deduct all operating expenses\n\n**Timing:** For development projects, stabilization typically occurs 12–24 months after completion. The period before stabilization requires interest reserves or sponsor support.',
    tags: ['valuation', 'development']
  },
  {
    front: 'Pro Forma',
    back: 'A forward-looking financial projection that models a property\'s expected income, expenses, and returns over a defined holding period. It is the central document in any CRE investment analysis.\n\n**Typical components:**\n1. Revenue projections (rent rolls, escalations, market rents)\n2. Vacancy & credit loss assumptions\n3. Operating expense budget with growth rates\n4. NOI schedule (annual)\n5. Debt service schedule\n6. Capital expenditure budget\n7. Cash flow to equity (after debt service)\n8. Reversion/exit sale proceeds\n9. Return metrics: IRR, EM, CoC\n\n**Best practices:**\n- Use multiple scenarios (base, upside, downside)\n- Clearly state all assumptions\n- Sensitize key variables (rent growth, exit cap, vacancy)\n\n**Warning:** A pro forma is only as good as its assumptions. Always stress-test.',
    tags: ['valuation', 'investment', 'fundamentals']
  },
  {
    front: 'Gross Lease vs. Net Lease (N, NN, NNN)',
    back: '**Gross Lease (Full Service):**\n- Landlord pays all operating expenses (taxes, insurance, maintenance, utilities)\n- Tenant pays a single, all-inclusive rent\n- Common in: office buildings\n\n**Net Lease types (tenant pays escalating portions of expenses):**\n\n- **Single Net (N):** Tenant pays base rent + property taxes\n- **Double Net (NN):** Tenant pays base rent + taxes + insurance\n- **Triple Net (NNN):** Tenant pays base rent + taxes + insurance + maintenance/CAM\n\n**NNN implications for investors:**\n- Landlord has minimal management burden\n- NOI is highly predictable\n- Tenant credit quality is critical (tenant bears most costs)\n- Lower cap rates due to predictable income\n\n**Data center relevance:** Most data center leases are structured as NNN or modified gross, with tenants responsible for power costs.',
    tags: ['leasing', 'fundamentals']
  },
  {
    front: 'Tenant Improvement Allowance (TI)',
    back: 'A dollar-per-square-foot allowance provided by the landlord to the tenant to customize or build out their leased space. It is a major component of leasing economics.\n\n**Typical ranges (office):**\n- New construction: $50–$100+/SF\n- Second-generation space: $20–$50/SF\n- Renewal: $10–$30/SF\n\n**How it works:**\n- Landlord provides TI as a construction allowance\n- Tenant manages the build-out (or landlord builds to tenant specs)\n- TI is amortized into the lease rate over the lease term\n- Higher TI = higher effective rent for the landlord\n\n**Key analysis:** Always calculate the net effective rent after amortizing TI and leasing commissions to compare deals accurately.\n\n**Data center context:** TI for powered shell vs. turnkey varies dramatically — shell tenants invest their own capital in MEP.',
    tags: ['leasing', 'development']
  },
  {
    front: 'Leasing Commissions (LC)',
    back: 'Fees paid to real estate brokers for securing a lease. Typically calculated as a percentage of total lease value and split between the tenant\'s broker and the landlord\'s broker.\n\n**Typical structure:**\n- 4%–6% of total lease value for new leases\n- 2%–3% for renewals\n- Split 50/50 between listing broker and tenant rep\n- Paid by the landlord at lease execution\n\n**Impact on economics:**\n- Leasing commissions are a significant upfront cost\n- Must be amortized over the lease term when analyzing returns\n- Combined with TI, they represent the landlord\'s "cost to lease"\n\n**Example:** 10-year lease, 10,000 SF at $30/SF = $3M total rent × 5% = $150K in leasing commissions\n\n**Key insight:** Longer lease terms spread these costs over more years, improving per-year economics.',
    tags: ['leasing']
  },
  {
    front: 'Expense Stop',
    back: 'A clause in a modified gross lease that sets a base level (dollar amount per SF) for operating expenses that the landlord will cover. The tenant pays their pro-rata share of any expenses above the stop.\n\n**How it works:**\n- Year 1 operating expenses = $12/SF (the "stop")\n- Year 2 actual expenses = $13/SF\n- Tenant pays the $1/SF overage\n\n**Landlord perspective:** Protects against rising costs over a long lease term. Shifts expense inflation risk to the tenant after the stop amount.\n\n**Tenant perspective:** Provides cost certainty up to the stop amount but creates exposure to operating expense escalation.\n\n**Negotiation points:**\n- Stop set at actual Year 1 expenses vs. budgeted amount\n- Gross-up provisions if building isn\'t fully occupied\n- Controllable vs. uncontrollable expense caps',
    tags: ['leasing']
  },
  {
    front: 'CAM Charges (Common Area Maintenance)',
    back: 'The tenant\'s pro-rata share of costs to maintain and operate common areas of a commercial property. A key component of NNN and modified gross leases.\n\n**Typical CAM items:**\n- Landscaping, parking lot maintenance, snow removal\n- Common area utilities and lighting\n- Security, janitorial services\n- Property management fees\n- Repairs to roof, structure, HVAC (in some leases)\n\n**Calculation:** CAM Charge = (Tenant SF / Building Total SF) × Total CAM Costs\n\n**Controllable CAM cap:** Tenants often negotiate a cap (e.g., 5% annual increase) on controllable expenses to limit exposure.\n\n**Landlord considerations:**\n- CAM reconciliation performed annually (actual vs. estimated)\n- Administrative fee (typically 10%–15%) often added on top\n- Must be transparent — tenants have audit rights',
    tags: ['leasing', 'fundamentals']
  },
  {
    front: 'Effective Gross Income (EGI)',
    back: 'The total income a property generates after accounting for vacancy and credit losses, plus any miscellaneous income.\n\n**Formula:** EGI = Potential Gross Income − Vacancy & Credit Loss + Other Income\n\n**Components:**\n- **Potential Gross Income (PGI):** Total rent if 100% occupied at market rates\n- **Vacancy & Credit Loss:** Expected income lost from unleased space and tenant defaults (typically 5%–10%)\n- **Other Income:** Parking, storage, antenna leases, late fees, vending\n\n**Where it fits:**\nPGI → Vacancy & Credit Loss → **EGI** → Operating Expenses → **NOI**\n\n**Why it matters:** EGI is the realistic income figure that feeds into NOI calculations. Using PGI without vacancy deductions overstates property performance.',
    tags: ['valuation', 'fundamentals']
  },
  {
    front: 'Vacancy and Credit Loss',
    back: 'An allowance in the pro forma for income lost due to unoccupied space (physical vacancy) and tenants who fail to pay rent (credit loss/bad debt).\n\n**Typical assumptions:**\n- Stabilized properties: 5%–10% of Potential Gross Income\n- Lease-up phase: higher, reflecting actual absorption schedule\n- Single-tenant NNN: often 0%–3% (one credit-worthy tenant)\n\n**Components:**\n- **Physical vacancy:** Unleased space between tenants\n- **Economic vacancy:** Space leased but below market rate, or free rent periods\n- **Credit loss:** Tenants who default or become delinquent\n\n**Why it matters:** Overly aggressive (low) vacancy assumptions inflate NOI and value. Lenders and institutional investors scrutinize this assumption closely.\n\n**Best practice:** Use submarket-specific vacancy rates and adjust for lease rollover timing.',
    tags: ['valuation', 'fundamentals']
  },
  {
    front: 'Operating Expense Ratio (OER)',
    back: 'The ratio of total operating expenses to Effective Gross Income. Measures operating efficiency.\n\n**Formula:** OER = Operating Expenses / Effective Gross Income\n\n**Typical ranges by property type:**\n- NNN retail: 10%–20% (minimal landlord expenses)\n- Industrial: 20%–30%\n- Office: 35%–50%\n- Multifamily: 35%–50%\n- Full-service hotel: 60%–75%\n\n**What drives high OER:**\n- Full-service lease structure (landlord pays more expenses)\n- Older buildings with deferred maintenance\n- High property tax jurisdictions\n- Intensive management requirements\n\n**Inverse metric:** Net Operating Income Margin = 1 − OER',
    tags: ['valuation', 'fundamentals']
  },
  {
    front: 'Replacement Reserves',
    back: 'An annual set-aside in the operating budget for future capital expenditures needed to maintain the property\'s physical condition and competitive position.\n\n**Purpose:** Smooth out lumpy capital costs (roof replacement, HVAC overhaul, elevator modernization) into predictable annual charges.\n\n**Typical amounts:**\n- Office/retail: $0.15–$0.30/SF/year\n- Multifamily: $200–$350/unit/year\n- Hotels: 4%–5% of gross revenue (FF&E reserve)\n\n**Accounting treatment:**\n- Below the NOI line (not an operating expense)\n- Deducted from NOI to calculate cash flow before debt service\n- Funded into a reserve account, drawn as needed\n\n**Lender requirements:** Many loan docs require funded reserves, especially for CMBS and agency loans.\n\n**Key distinction:** Replacement reserves are for capital items with useful lives > 1 year, not routine maintenance.',
    tags: ['valuation', 'development']
  },
  {
    front: 'Debt Service',
    back: 'The total periodic payment required to service a mortgage loan, including both principal repayment and interest.\n\n**Formula:** Debt Service = Principal Payment + Interest Payment\n\n**Payment structures:**\n- **Interest-only (I/O):** Only interest is paid; principal due at maturity\n- **Fully amortizing:** Equal payments that retire the full loan balance by maturity\n- **Partially amortizing:** Level payments based on a longer amortization schedule, with a balloon payment at maturity\n\n**Example (partially amortizing):**\n- $20M loan, 5% rate, 25-year amortization, 10-year term\n- Annual debt service: ~$1.4M\n- Balloon payment at year 10: ~$15.5M remaining balance\n\n**Cash flow impact:** NOI − Debt Service = Cash Flow Before Tax (CFBT). This is the cash the equity investor actually receives.',
    tags: ['debt', 'fundamentals']
  },
  {
    front: 'Amortization Schedule',
    back: 'A table showing how each periodic loan payment is split between interest and principal over the life of the loan, along with the remaining balance after each payment.\n\n**Key concepts:**\n- Early payments are mostly interest, later payments mostly principal\n- Longer amortization = lower periodic payment but more total interest\n- Common CRE amortization periods: 20, 25, or 30 years\n- Loan term (e.g., 10 years) is often shorter than amortization period → balloon payment at maturity\n\n**Amortization period matters because:**\n- Shorter amortization = faster equity build-up but lower cash flow\n- Longer amortization = higher cash flow but more interest paid and larger balloon\n- Lenders may require shorter amortization for higher-risk properties\n\n**Common structure:** 10-year term, 30-year amortization, 5-year I/O period → amortization begins in year 6.',
    tags: ['debt', 'fundamentals']
  },
  {
    front: 'Interest-Only (I/O) Period',
    back: 'A portion of the loan term during which the borrower pays only interest — no principal repayment — resulting in higher cash flow during that period.\n\n**Typical I/O periods:**\n- Stabilized assets: 1–3 years\n- Value-add: 2–5 years (full term I/O common)\n- Construction loans: Full term I/O (principal repaid at takeout)\n- Bridge loans: Full term I/O\n\n**Advantages:**\n- Maximizes cash flow during lease-up or renovation\n- Boosts equity IRR (more cash distributed earlier)\n- Provides operational flexibility during transition periods\n\n**Risks:**\n- No principal reduction = no equity build-up\n- Payment shock when amortization begins\n- Higher total interest cost over loan life\n- Larger balloon payment at maturity\n\n**Lender perspective:** I/O increases risk exposure because LTV doesn\'t decrease during the I/O period.',
    tags: ['debt', 'lending']
  },
  {
    front: 'Recourse vs. Non-Recourse Debt',
    back: '**Recourse debt:** Borrower is personally liable for the full loan amount. If the property value falls below the loan balance, the lender can pursue the borrower\'s other assets.\n\n**Non-recourse debt:** Lender\'s recovery is limited to the property itself. The borrower has no personal liability beyond "bad boy" carve-outs.\n\n**Bad boy carve-outs (non-recourse exceptions):**\n- Fraud or intentional misrepresentation\n- Voluntary bankruptcy filing\n- Environmental contamination\n- Unapproved transfer or additional debt\n- Misappropriation of rents or insurance proceeds\n\n**Market norms:**\n- Small/local bank loans: Often recourse\n- CMBS loans: Non-recourse with carve-outs\n- Life company loans: Typically non-recourse\n- Agency loans (Fannie/Freddie): Non-recourse\n\n**Risk trade-off:** Non-recourse comes with tighter covenants, lower LTV, and potentially higher rates.',
    tags: ['debt', 'lending']
  },
  {
    front: 'Mezzanine Debt',
    back: 'A form of subordinate financing that sits between senior debt and equity in the capital stack. Secured by a pledge of the borrower\'s ownership interest in the property-owning entity, not by a mortgage on the property itself.\n\n**Position in capital stack:**\n1. Senior debt (first mortgage): 50%–65% LTV\n2. **Mezzanine debt:** 65%–80% LTV\n3. Equity: 20%–35%\n\n**Key characteristics:**\n- Higher interest rate than senior debt (10%–15%+)\n- Shorter term (1–5 years)\n- Secured by equity pledge (not real property)\n- Requires intercreditor agreement with senior lender\n- Lender can foreclose on ownership interest via UCC foreclosure (faster than mortgage foreclosure)\n\n**When it\'s used:**\n- Bridge a gap when senior debt LTV is insufficient\n- Reduce equity requirement for higher-leveraged returns\n- Common in transitional or value-add deals',
    tags: ['debt', 'equity', 'structure']
  },
  {
    front: 'Preferred Equity',
    back: 'An equity investment that has priority over common equity in receiving distributions and return of capital, but sits below all debt in the capital stack.\n\n**Position in capital stack:**\n1. Senior debt\n2. Mezzanine debt\n3. **Preferred equity**\n4. Common equity (GP/LP)\n\n**Key characteristics:**\n- Fixed return (8%–15%), similar to debt pricing\n- Priority of payment over common equity\n- No mortgage or UCC lien — it\'s equity, not debt\n- Typically does not share in upside beyond the preferred return\n- No foreclosure rights — enforcement through operating agreement\n\n**Preferred equity vs. mezzanine debt:**\n- Mezz: secured by equity pledge, UCC foreclosure rights, lien\n- Pref equity: priority in distributions only, governed by operating agreement\n- Mezz interest is tax-deductible; pref equity returns are not\n\n**Use case:** When senior lender prohibits additional debt but borrower needs more leverage.',
    tags: ['equity', 'debt', 'structure']
  },
  {
    front: 'Pari Passu',
    back: 'A Latin term meaning "on equal footing." In CRE, it refers to investors or tranches of debt/equity that have equal priority of payment — no one gets paid before the other.\n\n**Applications:**\n- **Debt:** Two loans that share equally in collateral and payment priority\n- **Equity:** Multiple investors who receive distributions proportionally based on their ownership percentage, with no preferential treatment\n- **CMBS:** Multiple note holders within the same tranche receiving pro-rata payments\n\n**Example:** Three co-investors each own 33.3% of a property pari passu. Cash distributions of $300K are split $100K each — no waterfall, no preference.\n\n**Contrast with:** Preferred equity (has priority) or subordinated debt (junior position). Pari passu means specifically that priority is equal.',
    tags: ['equity', 'debt', 'structure']
  },
  {
    front: 'Senior vs. Junior (Subordinated) Debt',
    back: '**Senior debt:** The first mortgage or primary loan on a property. Has first priority claim on the property in the event of default.\n\n**Junior/subordinated debt:** Any debt that ranks below the senior loan in payment priority and collateral claims (second mortgage, mezzanine, etc.).\n\n**Key differences:**\n| | Senior | Junior |\n|---|---|---|\n| Priority | First claim | Subordinated |\n| Interest rate | Lower (4%–7%) | Higher (8%–15%+) |\n| LTV range | 50%–65% | 65%–85% |\n| Risk | Lower | Higher |\n| Recovery in default | Paid first | Paid only after senior is whole |\n\n**Intercreditor agreement:** When both exist on the same property, an ICA governs the relationship — including standstill periods, cure rights, and consent requirements.\n\n**Risk principle:** Junior debt bears disproportionate risk because it absorbs losses before senior lenders but has limited upside (fixed return, no equity participation).',
    tags: ['debt', 'structure']
  },
  {
    front: 'Loan-to-Cost (LTC)',
    back: 'The ratio of the loan amount to the total project cost (including land, hard costs, soft costs, and reserves). Used instead of LTV for construction and development loans where there is no stabilized value yet.\n\n**Formula:** LTC = Loan Amount / Total Project Cost\n\n**Typical ranges:**\n- Construction loans: 55%–65% LTC\n- Bridge/value-add: 70%–80% LTC\n\n**LTC vs. LTV:**\n- LTC is based on actual costs (more objective)\n- LTV is based on appraised value (more subjective)\n- For development: LTC is primary; LTV of the completed/stabilized project is secondary\n\n**Example:**\n- Total project cost: $100M\n- Construction loan: $60M\n- LTC = 60%\n- Appraised stabilized value: $140M\n- LTV = 43% (based on future value)\n\n**Lender perspective:** LTC ensures the sponsor has meaningful equity at risk relative to actual dollars spent.',
    tags: ['debt', 'development', 'lending']
  },
  {
    front: 'Construction Loan',
    back: 'A short-term, interest-only loan used to finance the construction of a commercial property. Funds are drawn incrementally as construction progresses.\n\n**Key characteristics:**\n- Term: 12–36 months (plus extensions)\n- Interest-only on drawn amounts only\n- Floating rate (SOFR + spread, typically 200–400 bps)\n- Funded in draws verified by inspections\n- Requires personal guarantees or recourse (often partial)\n\n**Draw process:**\n1. Borrower submits draw request with invoices\n2. Lender\'s inspector verifies work completion\n3. Funds released (minus retainage, typically 10%)\n\n**Requirements:**\n- Approved plans and permits\n- GMP or fixed-price construction contract\n- Pre-leasing thresholds (often 30%–50%)\n- Completion guaranty from sponsor\n- Interest reserve funded at closing\n\n**Exit:** Repaid by permanent loan (takeout financing) upon stabilization or by sale.',
    tags: ['debt', 'development', 'lending']
  },
  {
    front: 'Permanent Loan (Takeout Financing)',
    back: 'A long-term mortgage loan that replaces the construction or bridge loan once a property is stabilized (typically 90%+ occupied with seasoned cash flows).\n\n**Key characteristics:**\n- Term: 5–30 years (10 years most common in CRE)\n- Fixed or floating rate\n- Partially or fully amortizing\n- Non-recourse (for most institutional loans)\n\n**Common sources:**\n- Life insurance companies (best rates, most conservative)\n- CMBS conduits (higher leverage, more standardized)\n- Banks/credit unions (relationship lending, recourse)\n- Agency lenders (Fannie/Freddie — multifamily only)\n\n**Sizing criteria (most constraining wins):**\n- Maximum LTV (typically 65%–75%)\n- Minimum DSCR (typically 1.25x)\n- Minimum debt yield (typically 8%–10%)\n\n**Timing:** Borrower must secure a permanent loan commitment before or during construction to ensure the construction loan can be taken out.',
    tags: ['debt', 'lending']
  },
  {
    front: 'Ground Lease',
    back: 'A long-term lease (typically 50–99 years) in which the tenant leases land from the landowner and constructs improvements on it. The tenant owns the improvements during the lease term; ownership reverts to the landowner at expiration.\n\n**Key characteristics:**\n- Term: 50–99 years with renewal options\n- Rent: Fixed with periodic escalations (CPI or fixed %)\n- Tenant finances, builds, and operates improvements\n- Improvements revert to landlord at lease expiration\n\n**Advantages for tenant:**\n- Lower upfront capital (no land purchase)\n- Land lease payments are fully tax-deductible\n- May access locations otherwise unavailable for purchase\n\n**Advantages for landowner:**\n- Retains ownership of appreciating land\n- Steady, long-term income stream\n- Gets improved property at lease expiration\n\n**Financing challenge:** Lenders require leasehold mortgagee protections (notice and cure rights, new lease provisions) to finance improvements on leased land.',
    tags: ['leasing', 'structure', 'investment']
  },
  {
    front: 'Sale-Leaseback',
    back: 'A transaction where the property owner sells the property to a buyer and simultaneously leases it back from the buyer, becoming a tenant. The seller gets cash and retains use of the property.\n\n**Benefits for seller/tenant:**\n- Unlocks 100% of property value as cash (vs. 60%–75% via mortgage)\n- Converts owned asset to operating expense (may improve financial ratios)\n- Retains operational control of the property\n- Lease payments are fully tax-deductible\n\n**Benefits for buyer/landlord:**\n- Acquires stabilized, income-producing property\n- Long-term lease with creditworthy tenant\n- Minimal management burden (typically NNN lease)\n\n**Common in:** Corporate real estate, data centers, industrial facilities\n\n**Key risks:** Tenant credit risk, above-market rent at renewal, and the seller losing control of a strategic asset if the lease expires or they default.',
    tags: ['investment', 'structure', 'leasing']
  },
  {
    front: 'Residual Value',
    back: 'The estimated value of a property at the end of the analysis period (holding period) or at the end of a lease term. Also called terminal value or reversion value.\n\n**Calculation methods:**\n1. **Direct capitalization:** Residual Value = Forward NOI / Exit Cap Rate\n2. **Sales comparison:** Based on comparable sales at the projected disposition date\n3. **Depreciated replacement cost:** Original cost minus accumulated depreciation\n\n**In DCF analysis:**\n- Residual value is the largest single cash flow (often 50%–70% of total present value)\n- Small changes in exit cap rate dramatically impact value and returns\n\n**Sensitivity example:**\n- NOI at exit: $5M\n- Exit cap 5.5%: Value = $90.9M\n- Exit cap 6.0%: Value = $83.3M\n- Exit cap 6.5%: Value = $76.9M\n- 100 bps swing = ~$14M (18%) value difference\n\n**Best practice:** Always sensitize exit cap assumptions. Never rely on cap rate compression for your base case returns.',
    tags: ['valuation', 'investment']
  },
  {
    front: 'Highest and Best Use (HBU)',
    back: 'An appraisal concept that identifies the most profitable, legally permissible, physically possible, and financially feasible use of a property. The foundation of all real estate valuation.\n\n**Four tests (all must be met):**\n1. **Legally permissible:** Zoning, deed restrictions, environmental regulations allow it\n2. **Physically possible:** Site size, shape, topography, soil conditions, utilities support it\n3. **Financially feasible:** The use generates enough income to justify the cost of development\n4. **Maximally productive:** Among all feasible uses, this one produces the highest residual land value\n\n**Analyzed two ways:**\n- As vacant (what should be built?)\n- As improved (keep, modify, or demolish existing improvements?)\n\n**Data center relevance:** HBU analysis increasingly favors data center use on sites near substations and fiber, even when current zoning designates the land for industrial or office use.',
    tags: ['valuation', 'development']
  },
  {
    front: 'Entitlements',
    back: 'The legal approvals required before a property can be developed for its intended use. Entitlements convert raw or underutilized land into development-ready sites.\n\n**Common entitlements:**\n- Zoning approval or rezoning\n- Conditional Use Permit (CUP)\n- Site plan approval\n- Environmental review (NEPA/CEQA, Phase I/II ESA)\n- Building permits\n- Utility capacity commitments (water, sewer, power)\n- Traffic/transportation studies and approvals\n- Stormwater management permits\n\n**Timeline:** 6 months to 3+ years depending on jurisdiction and complexity\n\n**Value creation:** Entitled land is worth significantly more than unentitled land. The entitlement process is a primary source of risk and value in development.\n\n**Data center specific:**\n- Power allocation from utility (MW commitment)\n- Noise ordinance compliance\n- Cooling water rights\n- Height/FAR variances for multi-story facilities\n- Community opposition management',
    tags: ['development', 'fundamentals']
  },
  {
    front: 'Adverse Possession',
    back: 'A legal doctrine that allows a person to claim ownership of land they have occupied openly and continuously for a statutory period, without the owner\'s permission.\n\n**Required elements (vary by state):**\n1. **Open and notorious:** Possession is visible and obvious\n2. **Actual possession:** Physical use of the property\n3. **Exclusive:** Not shared with the true owner\n4. **Hostile/adverse:** Without the owner\'s permission\n5. **Continuous:** Uninterrupted for the statutory period\n\n**Statutory periods:** Typically 5–20 years depending on jurisdiction\n\n**Practical relevance:**\n- Boundary disputes between adjacent property owners\n- Encroachments (fences, driveways, structures)\n- Title searches should identify potential adverse possession claims\n\n**Defense:** Property owners can prevent adverse possession by granting permission (creating a license), posting the property, or ejecting trespassers before the statutory period expires.',
    tags: ['legal', 'fundamentals']
  },
];

async function main() {
  console.log('Adding CRE Glossary card set to existing A.CRE topic:', TOPIC_ID);

  const cardSet = await post('/api/topics/' + TOPIC_ID + '/sets', {
    name: 'CRE Glossary — Core Terms',
    description: 'Fifty essential commercial real estate terms from the A.CRE Glossary: valuation, debt structures, equity waterfalls, leasing economics, development, and investment analysis.'
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
  console.log('Done! Created', created, 'flashcards in card set "CRE Glossary — Core Terms"');
}

main().catch(e => console.error('Error:', e));
