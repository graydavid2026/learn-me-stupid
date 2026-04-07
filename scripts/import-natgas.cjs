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
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(new Error(buf)); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── SET 1: Fundamentals — Gas → Electricity ──
const set1 = [
  {
    front: 'What is Heat Rate and why is it the most important metric for gas-fired generation?',
    back: 'Heat Rate measures the amount of fuel energy (BTU) required to produce one kilowatt-hour of electricity.\n\n**Formula:** Heat Rate = Fuel Input (BTU) ÷ Electrical Output (kWh)\n\n**Units:** BTU/kWh (US) or kJ/kWh (metric)\n\n**Why it matters:** Lower heat rate = higher efficiency = lower fuel cost per MWh. A typical simple-cycle gas turbine has a heat rate of ~9,500–11,000 BTU/kWh. Combined cycle achieves ~6,300–7,000 BTU/kWh.\n\n**Efficiency conversion:** Efficiency (%) = 3,412 ÷ Heat Rate × 100\n\nHeat rate drives LCOE, dispatch economics, and vendor comparison.',
    tags: ['fundamentals', 'efficiency', 'economics']
  },
  {
    front: 'What are the key fuel characteristics of natural gas that affect power generation?',
    back: '**Composition:** Primarily methane (CH₄, 85-95%), with ethane, propane, CO₂, N₂, H₂S\n\n**Key properties:**\n• **Wobbe Index** — interchangeability measure (heating value ÷ √specific gravity). Must stay within turbine/engine tolerance band\n• **Higher Heating Value (HHV)** — ~1,020 BTU/scf (includes latent heat of water vapor)\n• **Lower Heating Value (LHV)** — ~920 BTU/scf (excludes latent heat, used for efficiency calcs)\n• **Methane Number** — knock resistance for reciprocating engines\n• **Pressure** — typically delivered at 250-1,000 psig on transmission; 2-60 psig distribution\n\n**Gas quality issues:** Moisture, H₂S (corrosion), liquid droplets (slug damage), BTU variability.',
    tags: ['fundamentals', 'fuel', 'gas-quality']
  },
  {
    front: 'What are the three start-up categories for gas generators and why do they matter?',
    back: '**Hot Start:** Unit was recently running (< 8 hours offline)\n• Fastest start: 30-60 min (turbines), 5-10 min (recips)\n• Minimal thermal stress\n\n**Warm Start:** Unit offline 8-48 hours\n• 1-3 hours (turbines), 10-15 min (recips)\n• Moderate thermal cycling stress\n\n**Cold Start:** Unit offline > 48 hours\n• 3-6+ hours (large turbines), 15-20 min (recips)\n• Maximum thermal stress on hot gas path\n• Requires slow ramp rates to avoid blade/rotor cracking\n\n**Why it matters:** Start-up time determines dispatch flexibility, grid response capability, and equipment lifecycle. Each start consumes "equivalent operating hours" — cold starts cost the most in maintenance reserves.',
    tags: ['fundamentals', 'operations', 'dispatch']
  },
  {
    front: 'What is the difference between Degradation and Lifecycle in gas generation assets?',
    back: '**Degradation:** Gradual loss of performance over operating hours\n• Heat rate increases 1-3% between major overhauls\n• Power output drops (compressor fouling, blade erosion, seal wear)\n• Recoverable (compressor wash, part replacement) vs. non-recoverable\n\n**Lifecycle:** Total expected life measured in:\n• **Fired Hours** — hours at operating temperature\n• **Equivalent Operating Hours (EOH)** — includes start penalties\n• **Starts** — each start = X equivalent fired hours\n\n**Typical intervals:**\n• Gas turbine hot gas path inspection: 12,000-25,000 EOH\n• Major overhaul: 24,000-50,000 EOH\n• Recip top-end overhaul: 25,000 hours\n• Recip major overhaul: 50,000-60,000 hours\n\nDegradation drives dispatch economics; lifecycle drives CapEx reserves.',
    tags: ['fundamentals', 'maintenance', 'lifecycle']
  },
  {
    front: 'What are the primary CapEx and OpEx cost drivers for gas-fired generation?',
    back: '**CapEx drivers:**\n• Equipment cost (turbine/engine, generator, controls)\n• Balance of Plant (switchgear, transformers, fuel system, cooling)\n• EPC margin and construction labor\n• Site prep, foundations, buildings\n• Interconnection costs (utility + gas lateral)\n• Environmental permitting & compliance equipment (SCR, CEMS)\n\n**OpEx drivers:**\n• **Fuel cost** — typically 60-80% of total OpEx\n• Long-Term Service Agreements (LTSAs) — major maintenance reserves\n• O&M labor (operators, technicians)\n• Insurance, property tax\n• Water/chemical treatment\n• Emissions compliance (CEMS monitoring, catalyst replacement)\n\n**Benchmark (2024):**\nSimple cycle: $800-1,200/kW CapEx\nCombined cycle: $1,000-1,500/kW CapEx\nRecip cluster: $900-1,400/kW CapEx',
    tags: ['fundamentals', 'economics', 'capex', 'opex']
  },
  {
    front: 'What is a Dispatch Profile and how does it differ by generator type?',
    back: 'A dispatch profile describes when and how a generator operates relative to grid demand and economics.\n\n**Baseload:** 7,000-8,500 hours/year, steady output\n• Best for: Large combined cycle (CCGT)\n• Lowest marginal cost, highest efficiency\n\n**Intermediate/Load-following:** 2,000-5,000 hours/year, variable output\n• Best for: Aeroderivative turbines, recip clusters\n• Requires fast ramp rates, good part-load efficiency\n\n**Peaking:** < 2,000 hours/year, called during high demand\n• Best for: Simple cycle turbines, recip engines\n• Fast start is more important than efficiency\n\n**Behind-the-meter (data centers):** 8,000+ hours/year, island or grid-parallel\n• Recip clusters or CHP configurations\n• Dispatch driven by campus load, not grid prices\n\nThe dispatch profile determines which technology wins on LCOE.',
    tags: ['fundamentals', 'dispatch', 'operations']
  },
  {
    front: 'What is the Brayton Cycle and how does it apply to gas turbines?',
    back: 'The **Brayton Cycle** is the thermodynamic cycle that describes gas turbine operation.\n\n**Four stages:**\n1. **Compression** — Air compressed to 15-30:1 pressure ratio (compressor)\n2. **Heat Addition** — Fuel injected and burned at constant pressure (combustor) → 2,000-2,600°F\n3. **Expansion** — Hot gas expands through turbine, producing shaft work\n4. **Heat Rejection** — Exhaust gas exits at 900-1,100°F\n\n**Efficiency limits:** Theoretical max ~40% for simple cycle; real-world 32-38%\n\n**Key relationship:** Higher firing temperature → higher efficiency → but requires advanced blade cooling and metallurgy\n\n**Combined cycle adds:** Rankine cycle (steam) on the back end using exhaust heat → pushes total efficiency to 55-63%.',
    tags: ['fundamentals', 'thermodynamics', 'gas-turbines']
  },
];

// ── SET 2: RICE (Reciprocating Engines) ──
const set2 = [
  {
    front: 'When do Reciprocating Engines (RICE) beat Gas Turbines for power generation?',
    back: '**RICE wins when:**\n• **Load-following** is needed — recips maintain efficiency at 50-100% load; turbines degrade significantly below 70%\n• **Fast start** is critical — recips start in 5-10 minutes vs. hours for large turbines\n• **Modular scaling** — add engines incrementally (1-20 MW each) vs. one large turbine\n• **Frequent starts/stops** — recips handle cycling better with lower start penalties\n• **Altitude/temperature** — recips derate less than turbines at elevation or high ambient\n• **Small sites** (15-50 MW) — below the economic threshold for combined cycle\n\n**RICE loses when:**\n• Scale > 100 MW (turbine $/kW advantage)\n• Continuous baseload > 8,000 hrs/yr at steady load\n• Combined cycle heat rates (6,300 BTU/kWh) are needed\n• Exhaust heat quality matters (recip exhaust is lower temp)',
    tags: ['rice', 'technology-selection']
  },
  {
    front: 'What are the key overhaul intervals for large-bore natural gas reciprocating engines?',
    back: '**Typical intervals (Wärtsilä/MAN/CAT):**\n\n• **Minor service:** Every 2,000-4,000 hours\n  — Oil/filter changes, spark plugs, valve adjustment\n\n• **Top-end overhaul:** ~25,000 hours\n  — Cylinder heads, valves, pistons, rings\n  — Engine stays in place; 3-5 day outage per engine\n\n• **Major overhaul:** ~50,000-60,000 hours\n  — Complete teardown: crankshaft, bearings, liners, turbocharger rebuild\n  — 2-4 week outage per engine\n\n**Cost benchmarks:**\n• LTSA cost: $8-15/MWh (covers parts + labor for all scheduled maintenance)\n• Major overhaul cost: $1.5-3M per engine (18-20 MW class)\n\n**Key concept:** Overhaul intervals are based on **running hours**, but **starts count as equivalent hours** (each start = 10-20 equivalent hours).',
    tags: ['rice', 'maintenance', 'ltsa']
  },
  {
    front: 'What is turbocharging and intercooling in large natural gas reciprocating engines?',
    back: '**Turbocharging:** Uses a turbine driven by exhaust gas to compress intake air, increasing air density and power output per cylinder.\n\n• Allows more fuel/air charge per stroke → more power from same displacement\n• Typical boost pressure: 2-4 bar absolute\n• Key components: turbine wheel, compressor wheel, wastegate\n\n**Intercooling:** Cools the compressed intake air between turbocharger stages (or after turbo, before intake).\n\n• Compressed air is hot → less dense → intercooler removes heat\n• Increases charge density → more power + lower combustion temps\n• Lower combustion temp → lower NOx emissions\n• Uses jacket water or separate cooling circuit\n\n**Together:** Turbo + intercooling enables large-bore gas engines to achieve 42-48% electrical efficiency at 10-20 MW per unit — competitive with aeroderivative turbines.',
    tags: ['rice', 'engineering', 'performance']
  },
  {
    front: 'What is fuel gas derating and altitude correction for RICE?',
    back: '**Fuel Gas Derating:**\nEngine output must be reduced if gas quality deviates from the design specification.\n\n• **Low methane number** → knock risk → reduce timing/load\n• **Low BTU gas** (high CO₂/N₂) → less energy per cycle → derate output\n• **High Wobbe Index variation** → control system struggles → restrict range\n• Typical derating: 2-5% per 50 BTU/scf below rated HHV\n\n**Altitude Correction:**\nThinner air at elevation = less oxygen per cycle = less power.\n\n• Rule of thumb: ~3% derating per 1,000 ft above sea level\n• Turbocharged engines are less affected than naturally aspirated\n• Example: 20 MW engine at 5,000 ft → ~17-18 MW (before turbo compensation)\n\n**Temperature correction:** ~0.5-1% derating per °F above 59°F (ISO conditions)\n\n**Why it matters:** Site-specific derating directly affects CapEx/kW and project economics. Always demand vendor curves, not just ISO ratings.',
    tags: ['rice', 'performance', 'site-conditions']
  },
  {
    front: 'What are NSCR and SCR emissions controls for reciprocating engines?',
    back: '**NSCR (Non-Selective Catalytic Reduction):**\n• Also called 3-way catalyst\n• Simultaneously reduces NOx, CO, and VOCs\n• Requires engine to run at precise air/fuel ratio (lambda ≈ 1.0)\n• Simple, lower cost, effective for rich-burn engines\n• NOT suitable for lean-burn engines\n\n**SCR (Selective Catalytic Reduction):**\n• Injects urea/ammonia upstream of a catalyst to convert NOx → N₂ + H₂O\n• Works with lean-burn engines (higher efficiency engines)\n• More complex: requires urea storage, dosing system, catalyst\n• Higher cost but handles higher exhaust volumes\n• Required when NOx limits < 0.5 g/bhp-hr\n\n**Oxidation Catalyst:** Often added downstream of either system to clean up residual CO and formaldehyde.\n\n**Emission targets:**\n• RICE MACT (40 CFR 63 Subpart ZZZZ)\n• Typical permit limits: NOx < 0.5-1.0 g/bhp-hr, CO < 2.0 g/bhp-hr',
    tags: ['rice', 'emissions', 'permitting']
  },
  {
    front: 'What is an LTSA (Long-Term Service Agreement) for reciprocating engines?',
    back: '**Definition:** A contract with the engine OEM or authorized service provider covering all scheduled maintenance over a defined period (typically 10-20 years or a set number of operating hours).\n\n**What it typically covers:**\n• All scheduled inspections and overhauls (minor, top-end, major)\n• Parts and labor\n• Performance guarantees (availability, heat rate)\n• Remote monitoring and diagnostics\n• Unscheduled repairs (depending on scope)\n\n**What it does NOT cover:**\n• Fuel, lube oil (sometimes)\n• Balance of plant (switchgear, transformers)\n• Operator labor\n• Catastrophic/force majeure events\n\n**Pricing:** $8-15/MWh (or $/operating hour)\n\n**Key negotiation points:**\n• **Availability guarantee** — 92-97% typical; penalties (LDs) if missed\n• **Heat rate guarantee** — degradation allowance over time\n• **Parts vs. exchange** — new parts or refurbished?\n• **Escalation** — annual price increases capped?\n• **Exclusivity** — can you use third-party parts?',
    tags: ['rice', 'procurement', 'ltsa', 'contracts']
  },
  {
    front: 'What are the main control system architectures for reciprocating engine power plants?',
    back: '**Engine-level controls:**\n• **DEIF** — Danish; popular for multi-engine plants, strong paralleling/load-sharing\n• **Woodward** — US; dominant in gas engine speed/load control, fuel metering\n• **ABB Ability** — integrated plant-level control + remote monitoring\n• **OEM proprietary** — Wärtsilä UNIC, CAT ADEM, MAN SaCoS\n\n**Plant-level SCADA/DCS:**\n• Aggregates all engines + BoP into single operator interface\n• Load dispatch, sequencing (which engines start/stop)\n• Grid interconnection protection (25, 27, 81 relays)\n• Emissions monitoring (CEMS integration)\n\n**Key functions:**\n• **Automatic load sharing** — distributes MW across running engines\n• **Black start sequencing** — automated restart after outage\n• **Ramp rate control** — meets grid or campus load changes\n• **Paralleling** — synchronize engines to bus (voltage, frequency, phase matching)\n\n**Trend:** OEMs pushing cloud-connected diagnostics with predictive maintenance.',
    tags: ['rice', 'controls', 'scada']
  },
];

// ── SET 3: Gas Turbines ──
const set3 = [
  {
    front: 'What is the difference between aeroderivative and heavy-frame (industrial) gas turbines?',
    back: '**Aeroderivative:**\n• Derived from aircraft jet engines (GE LM2500/6000, P&W FT8, Rolls-Royce)\n• 5-80 MW range\n• Higher efficiency at simple cycle (38-42%)\n• Lighter, more compact, modular\n• Fast start: 10-15 minutes to full load\n• Higher $/kW but lower installation cost\n• Better part-load efficiency\n\n**Heavy-Frame (Industrial):**\n• Purpose-built for power generation (GE 7F/9HA, Siemens 8000H, MHPS M701)\n• 100-600+ MW range\n• Lower simple-cycle efficiency (33-38%) but combined cycle reaches 60%+\n• Massive, requires heavy foundations\n• Slow start: 1-6 hours\n• Lower $/kW at scale\n• Designed for baseload operation\n\n**Decision driver:** Below 80 MW → aeroderivative. Above 150 MW baseload → heavy frame + HRSG for combined cycle.',
    tags: ['gas-turbines', 'technology-selection']
  },
  {
    front: 'What is compressor surge and stall in a gas turbine, and why is it dangerous?',
    back: '**Compressor Stall:** Airflow separates from compressor blades (like an aircraft wing stalling). Individual blade or stage loses lift.\n• Causes: rapid load changes, inlet distortion, fouled blades, off-design operation\n• Result: localized vibration, efficiency loss, possible blade damage\n\n**Compressor Surge:** Complete flow reversal through the compressor — air momentarily flows backward.\n• The entire compressor becomes unstable\n• Audible "bang" or "whomp" sound\n• Extreme mechanical stress on blades, bearings, seals\n• Can cause catastrophic damage in seconds\n\n**Surge Line:** The boundary on the compressor map between stable and unstable operation. Controls must keep operating point safely away from this line (surge margin).\n\n**Protection:**\n• Bleed valves (dump excess air)\n• Variable inlet guide vanes (VIGVs)\n• Anti-surge controllers\n• Load shedding protection',
    tags: ['gas-turbines', 'engineering', 'failure-modes']
  },
  {
    front: 'What are the hot gas path components in a gas turbine and why do they drive maintenance cost?',
    back: '**Hot Gas Path (HGP) components:**\n• **Combustion liners / transition pieces** — contain the flame\n• **First-stage nozzles (vanes)** — direct hot gas onto turbine blades\n• **First-stage buckets (blades)** — extract energy from gas (highest stress)\n• **Second/third-stage nozzles and buckets**\n• **Shrouds and seals**\n\n**Why they drive cost:**\n• Operate at 2,000-2,600°F — near the melting point of the metal\n• Require exotic superalloys (nickel-based: Inconel, Rene, CMSX)\n• Use internal cooling channels and thermal barrier coatings (TBC)\n• Single-crystal castings for first-stage blades ($50K-150K per blade)\n• Limited life: 24,000-48,000 EOH between HGP inspections\n\n**HGP inspection cost:** $5-15M for large frame turbines\n**Major overhaul (including rotor):** $15-30M\n\nHGP inspection intervals and parts costs dominate the LTSA economics.',
    tags: ['gas-turbines', 'maintenance', 'hot-gas-path']
  },
  {
    front: 'What is a Combined Cycle Gas Turbine (CCGT) and how does it achieve 60%+ efficiency?',
    back: '**Architecture:**\n1. **Gas Turbine (Brayton Cycle)** — burns fuel, exhausts at 900-1,100°F\n2. **HRSG (Heat Recovery Steam Generator)** — captures exhaust heat to make steam\n3. **Steam Turbine (Rankine Cycle)** — uses steam to generate additional electricity\n4. **Condenser** — condenses steam back to water; rejects waste heat\n\n**Efficiency math:**\n• Gas turbine alone: ~38% efficiency (simple cycle)\n• HRSG captures ~50% of remaining exhaust energy\n• Steam turbine converts that to electricity\n• Combined: **55-63% net efficiency** (GE 9HA.02 holds record at 64%)\n\n**Configuration notation:**\n• 1×1: One gas turbine + one steam turbine\n• 2×1: Two gas turbines sharing one steam turbine (most common utility scale)\n\n**When it\'s worth it:**\n• Baseload operation > 5,000 hours/year\n• > 100 MW\n• Steam host available (CHP) improves economics further\n• HRSG adds $200-400/kW to CapEx but cuts fuel cost 30-40%',
    tags: ['gas-turbines', 'combined-cycle', 'hrsg']
  },
  {
    front: 'What is the Mark VIe and why does it matter for GE gas turbines?',
    back: '**Mark VIe** is GE\'s current-generation turbine control system (successor to Mark V, Mark VI).\n\n**What it controls:**\n• Fuel metering (gas valve position, fuel splits between nozzles)\n• Combustion tuning (DLN — Dry Low NOx system)\n• Speed/load control\n• Protective functions (trips, alarms)\n• Generator excitation interface\n• Start/stop sequencing\n\n**Key features:**\n• Triple-modular redundant (TMR) — three independent controllers vote; 2-of-3 logic\n• Ethernet-based I/O (vs. older serial systems)\n• Integrated vibration monitoring\n• Historian and remote monitoring capability\n\n**Why it matters for project development:**\n• Control system expertise is scarce and expensive\n• OEM-only support creates vendor lock-in\n• Retrofit from Mark V → Mark VIe costs $2-5M but extends turbine life\n• Third-party control alternatives exist (Emerson Ovation, Woodward) but void some warranties\n\nSiemens equivalent: T3000. MHPS equivalent: DIASYS Netmation.',
    tags: ['gas-turbines', 'controls', 'ge']
  },
  {
    front: 'What is Combustion Tuning / DLN (Dry Low NOx) and why does it matter?',
    back: '**DLN (Dry Low NOx):** A combustion technology that reduces NOx emissions without water/steam injection.\n\n**How it works:**\n• Pre-mixes fuel and air before combustion (lean premix)\n• Burns at lower flame temperature → dramatically reduces thermal NOx\n• Multiple fuel nozzles with staged fuel splits\n• Transitions through combustion modes as load increases\n\n**Combustion tuning:**\n• Adjusting fuel splits, pilot ratios, and air flow to maintain:\n  — Low NOx and CO emissions simultaneously\n  — Stable combustion (no flashback or lean blowout)\n  — Acceptable combustion dynamics (pressure pulsations)\n• Must be retuned after HGP inspections, part replacements, or fuel changes\n\n**Why it matters:**\n• Poorly tuned DLN → high emissions → permit violations\n• Combustion dynamics (rumble) → can crack combustion liners in hours\n• Tuning requires specialized engineers (OEM or certified third-party)\n• NOx limits: typically 9-25 ppm @ 15% O₂ depending on permit',
    tags: ['gas-turbines', 'emissions', 'combustion']
  },
];

// ── SET 4: CHP / HRSG ──
const set4 = [
  {
    front: 'What is CHP (Combined Heat and Power) and when does it improve LCOE for data centers?',
    back: '**CHP (Cogeneration):** Simultaneously generates electricity and captures waste heat for useful thermal purposes.\n\n**Efficiency:** 65-85% total fuel utilization vs. 35-60% for electricity-only\n\n**When CHP improves LCOE for data centers:**\n• Campus has significant heating/cooling load (office buildings, labs, district heating)\n• Absorption chillers can use waste heat for cooling (displaces electric chillers)\n• 8,000+ annual operating hours (high capacity factor)\n• Gas prices are low relative to electricity prices (spark spread is favorable)\n• Avoided transmission/distribution costs (behind-the-meter)\n\n**When CHP does NOT make sense:**\n• Pure IT load with no thermal demand\n• Low utilization / peaking duty\n• High gas prices relative to grid electricity\n• Constrained air permit (CHP doesn\'t reduce site emissions)\n\n**Typical savings:** 15-30% reduction in total energy cost vs. separate heat and power.',
    tags: ['chp', 'economics', 'data-center']
  },
  {
    front: 'What is an HRSG (Heat Recovery Steam Generator) and how does it work?',
    back: '**HRSG:** A heat exchanger that captures exhaust heat from a gas turbine (or engine) to produce steam.\n\n**Structure:**\n• **Economizer** — preheats feedwater using cooler exhaust\n• **Evaporator** — converts water to saturated steam\n• **Superheater** — raises steam temperature above saturation\n• **Drum** — separates steam from water\n\n**Pressure levels:**\n• **Single-pressure:** One steam pressure level (simpler, less efficient)\n• **Dual-pressure:** Two levels (HP + LP) — more heat recovery\n• **Triple-pressure with reheat:** Three levels — maximum efficiency (used in large CCGT)\n\n**Key parameters:**\n• Approach temperature: difference between drum saturation temp and economizer outlet\n• Pinch point: minimum temperature difference between exhaust and steam — drives HRSG size/cost\n• Stack temperature: lower = more heat recovered, but risk of acid condensation below 250°F\n\n**Output:** 100-300 psig steam typical for CHP; 900-2,400 psig for combined cycle power.',
    tags: ['chp', 'hrsg', 'engineering']
  },
  {
    front: 'What is the difference between a backpressure and a condensing steam turbine in CHP?',
    back: '**Backpressure (Topping) Turbine:**\n• Steam exhausts at above-atmospheric pressure (15-150 psig)\n• Exhaust steam is used directly for process heat or heating\n• All steam energy is utilized (power + heat)\n• Less electricity per lb of steam, but higher total efficiency\n• Simpler — no condenser, no cooling tower needed\n• Best for: facilities with constant, large thermal load\n\n**Condensing Turbine:**\n• Steam exhausts into a vacuum condenser (1-4" Hg absolute)\n• Maximizes electrical output per lb of steam\n• Requires condenser + cooling tower (water-intensive)\n• Lower total efficiency but more electricity\n• Best for: utility-scale power, or when thermal demand is small/variable\n\n**Extraction Turbine (hybrid):**\n• Steam is extracted at intermediate pressure for process use\n• Remaining steam continues to condenser\n• Provides flexibility between heat and power output',
    tags: ['chp', 'steam-turbines', 'technology-selection']
  },
];

// ── SET 5: Pipeline & Gas Supply ──
const set5 = [
  {
    front: 'What is MAOP (Maximum Allowable Operating Pressure) and why does it matter for gas laterals?',
    back: '**MAOP:** The maximum pressure at which a gas pipeline can legally operate, determined by pipe material, wall thickness, grade, and design factor.\n\n**Governed by:** 49 CFR Part 192 (federal pipeline safety regulations)\n\n**How it\'s calculated:**\nMAOP = (2 × S × t × F × E × T) ÷ D\n• S = specified minimum yield strength\n• t = wall thickness\n• F = design factor (0.4-0.72 depending on class location)\n• E = longitudinal joint factor\n• T = temperature derating factor\n• D = outside diameter\n\n**Class locations (population density):**\n• Class 1: Rural (F = 0.72)\n• Class 2: Suburban (F = 0.60)\n• Class 3: Urban (F = 0.50)\n• Class 4: Multi-story buildings (F = 0.40)\n\n**Why it matters:** Your gas lateral must deliver enough pressure and flow to meet generator fuel demands. MAOP determines pipe size, distance limits, and compression needs.',
    tags: ['pipeline', 'gas-supply', 'engineering']
  },
  {
    front: 'What is the Wobbe Index and why is it critical for gas-fired generation?',
    back: '**Definition:** A measure of fuel gas interchangeability — how a gas with different composition will behave in equipment designed for a reference gas.\n\n**Formula:** Wobbe Index = Higher Heating Value ÷ √(Specific Gravity)\n\n**Units:** BTU/scf (same as HHV but adjusted)\n\n**Typical range for US pipeline gas:** 1,310-1,390 BTU/scf\n\n**Why it\'s critical:**\n• Gas turbines and engines are designed for a specific Wobbe range (typically ±5%)\n• Too high → rich combustion → high NOx, potential damage\n• Too low → lean combustion → misfires, flameout\n• Sudden changes → combustion instability → trips\n\n**Gas quality issues that shift Wobbe:**\n• Ethane/propane content variation (seasonal, pipeline source changes)\n• CO₂ or N₂ dilution (from certain wells)\n• LNG regasification (higher methane purity, different Wobbe)\n\n**Mitigation:** Gas chromatograph + adaptive fuel control; contractual gas quality specs with utility.',
    tags: ['pipeline', 'gas-quality', 'fuel']
  },
  {
    front: 'What are the components of a gas pressure reduction station?',
    back: '**Purpose:** Reduce gas pressure from transmission/high-pressure distribution to the pressure required by the generation equipment.\n\n**Components:**\n• **Inlet isolation valve** — manual shutoff\n• **Strainer/filter** — removes particulate\n• **Pressure regulator (primary)** — reduces pressure (e.g., 500 psig → 250 psig)\n• **Monitor regulator** — backup; takes over if primary fails\n• **Slam-shut valve** — overpressure protection; snaps closed if pressure exceeds setpoint\n• **Relief valve** — vents gas if slam-shut fails (last resort)\n• **Gas heater** — prevents regulator freeze-up from Joule-Thomson cooling during pressure drop\n• **Metering** — ultrasonic or turbine meter for custody transfer\n• **Odorant injection** — adds mercaptan for leak detection (if not already odorized)\n• **Outlet isolation valve**\n\n**Design considerations:** Noise attenuation, pilot gas supply for engines, redundancy (N+1 regulators), freeze protection in cold climates.',
    tags: ['pipeline', 'gas-supply', 'equipment']
  },
  {
    front: 'How do you size a gas lateral to support a 15-50 MW reciprocating engine plant?',
    back: '**Step 1 — Calculate fuel demand:**\n• Total plant output: e.g., 30 MW\n• Heat rate: ~8,200 BTU/kWh (recip)\n• Fuel flow: 30,000 kW × 8,200 BTU/kWh = 246 MMBTU/hr\n• At ~1,020 BTU/scf: ~241,000 scf/hr = ~4,017 scfm\n\n**Step 2 — Select pipe diameter:**\n• Use Weymouth or Panhandle equation for flow vs. pressure drop\n• Typical lateral: 6"-12" diameter depending on length and pressure\n• Must maintain minimum inlet pressure at the plant (e.g., 75 psig for recips)\n\n**Step 3 — Confirm supply pressure:**\n• Utility delivery pressure (check tariff/contract)\n• Pressure drop over lateral length\n• Pressure drop through regulation station\n• Final delivery pressure to engines\n\n**Step 4 — Gas quality confirmation:**\n• BTU content, Wobbe Index range from utility\n• Moisture, H₂S levels\n• Contractual quality guarantees\n\n**Timeline:** Gas lateral permitting/construction: 12-24 months. Often the longest lead time in the project.',
    tags: ['pipeline', 'gas-supply', 'sizing', 'data-center']
  },
];

// ── SET 6: Electrical Balance of Plant ──
const set6 = [
  {
    front: 'What are the key electrical BoP components for a gas generation facility?',
    back: '**Balance of Plant (BoP)** includes everything between the generator terminals and the point of interconnection:\n\n• **Generator** — converts mechanical shaft power to electrical power\n• **Generator breaker** — connects/disconnects generator from bus\n• **Step-up transformer** — generator voltage (typically 4.16-13.8 kV) to interconnection voltage\n• **Medium-voltage switchgear** — main bus, feeder breakers, protective relays\n• **Protective relay system** — 25, 27, 32, 50/51, 59, 81, 86, 87 devices\n• **Synchronization equipment** — matches voltage, frequency, phase before closing onto bus\n• **Excitation system** — controls generator voltage/reactive power\n• **Station service transformer** — provides auxiliary power for plant loads\n• **DC system** — batteries + charger for control power, breaker tripping\n• **SCADA/DCS** — plant-level supervisory control\n• **Grounding system** — generator neutral grounding, equipment grounding grid\n• **Revenue metering** — utility custody transfer meters\n\n**BoP cost:** Typically 20-35% of total plant CapEx.',
    tags: ['bop', 'electrical', 'equipment']
  },
  {
    front: 'What is generator paralleling and synchronization?',
    back: '**Synchronization:** The process of matching a generator\'s output to the bus (or grid) before connecting.\n\n**Four conditions that must match:**\n1. **Voltage** — generator voltage = bus voltage (±5%)\n2. **Frequency** — generator frequency = bus frequency (±0.1 Hz)\n3. **Phase angle** — generator phase aligned with bus phase (±10°)\n4. **Phase sequence** — A-B-C rotation matches (verified at commissioning)\n\n**Synch check relay (ANSI 25):** Verifies all conditions are met before allowing breaker close.\n\n**Synchroscope:** Visual instrument showing relative phase angle and slip frequency. Operator (or auto-sync) closes breaker at "12 o\'clock" position with slow clockwise rotation.\n\n**Auto-synchronizer:** Automatically adjusts governor (speed) and exciter (voltage) to achieve sync conditions, then closes breaker.\n\n**Risks of out-of-phase closure:**\n• Extreme mechanical torque on shaft and coupling\n• Electrical current spike (10-15x rated)\n• Potential catastrophic damage to generator and prime mover',
    tags: ['bop', 'electrical', 'synchronization']
  },
  {
    front: 'What is an arc flash study and why is it required?',
    back: '**Arc Flash:** An explosive release of energy caused by an electrical arc between conductors or from conductor to ground.\n\n**Temperatures:** 35,000°F+ (hotter than the surface of the sun)\n**Pressure wave:** Can throw a person across a room\n**Burns:** Severe or fatal from several feet away\n\n**Arc Flash Study:**\n• Engineering analysis that calculates **incident energy** (cal/cm²) at each point in the electrical system\n• Determines required **PPE level** for workers\n• Sets **arc flash boundary** (distance at which 1.2 cal/cm² occurs — onset of second-degree burns)\n\n**Required by:**\n• NFPA 70E (Electrical Safety in the Workplace)\n• OSHA (General Duty Clause)\n• Must be updated when system configuration changes\n\n**Key inputs:** Short-circuit current, protective device clearing time, working distance\n**Key output:** Warning labels on every piece of switchgear and panelboard\n\n**Lower clearing time = lower arc flash energy.** This is why coordination studies and fast relays matter.',
    tags: ['bop', 'electrical', 'safety', 'arc-flash']
  },
  {
    front: 'What is a coordination study and why is it critical for power plant protection?',
    back: '**Coordination Study (Protective Device Coordination):** An engineering analysis that sets the trip characteristics of all protective devices (breakers, relays, fuses) so that only the device nearest to the fault trips.\n\n**Goal:** Selective coordination — isolate the fault with minimum disruption to the rest of the system.\n\n**How it works:**\n• Plot time-current curves (TCC) of all devices on the same graph\n• Ensure downstream devices trip faster than upstream devices for any fault current\n• Maintain adequate margins between curves\n\n**Without coordination:**\n• A fault on one feeder could trip the main breaker → entire plant goes dark\n• Or multiple devices trip simultaneously → confusion about fault location\n\n**Key considerations for generation:**\n• Generator short-circuit contribution decays over time (subtransient → transient → synchronous)\n• Must coordinate with utility protection at the interconnection point\n• Arc flash energy is directly affected by device clearing times\n\n**Standards:** IEEE 242 (Buff Book), NEC 240.12, NEC 700.32 (emergency systems)',
    tags: ['bop', 'protection', 'coordination']
  },
];

// ── SET 7: Emissions & Permitting ──
const set7 = [
  {
    front: 'What is a Title V permit vs. a Minor NSR permit for gas generation?',
    back: '**Title V (Major Source):**\n• Required when a facility is a "major source" — potential to emit (PTE) exceeds thresholds:\n  — 100 tons/year of any criteria pollutant (NOx, CO, PM, SO₂, VOC)\n  — 10 tons/year of any single HAP, or 25 tons/year combined HAPs\n• Comprehensive operating permit — covers all emission units at the site\n• Annual compliance certification\n• Public notice and comment required\n• 5-year renewal cycle\n• Permit fees ($25-100K+/year)\n\n**Minor NSR (New Source Review):**\n• For facilities below major source thresholds\n• Simpler, faster permitting process\n• State-administered (rules vary)\n• May include synthetic minor limits (accept enforceable caps to stay below major thresholds)\n\n**PSD (Prevention of Significant Deterioration):**\n• Triggered for major sources in attainment areas\n• Requires BACT (Best Available Control Technology)\n• Air quality modeling (AERMOD) required\n\n**For data centers:** A 30 MW recip plant often needs Title V. Careful capacity limiting (< 100 TPY NOx) can keep you as synthetic minor.',
    tags: ['permitting', 'emissions', 'title-v']
  },
  {
    front: 'What is BACT (Best Available Control Technology) and how does it affect project cost?',
    back: '**BACT:** The maximum degree of emissions reduction achievable, considering energy, environmental, and economic impacts. Required for major sources under PSD.\n\n**BACT determination process (top-down):**\n1. Identify all available control technologies\n2. Eliminate technically infeasible options\n3. Rank remaining by effectiveness\n4. Evaluate energy, environmental, and economic impacts\n5. Select the most effective technology unless cost per ton removed is unreasonable\n\n**Typical BACT for gas generation:**\n• **NOx:** SCR (0.005-0.015 lb/MMBTU) — adds $50-150/kW CapEx\n• **CO:** Oxidation catalyst (0.01-0.04 lb/MMBTU) — adds $20-50/kW\n• **PM/PM2.5:** Good combustion practice (inherently low for gas)\n• **VOC:** Oxidation catalyst (same as CO)\n\n**Cost impact:**\n• Emission controls can add 5-15% to total plant CapEx\n• Ongoing costs: catalyst replacement ($200-500K every 3-5 years), urea for SCR ($50-150K/year)\n• CEMS (Continuous Emissions Monitoring): $200-400K install + $50K/year O&M\n\n**Strategy:** Design to stay below major source thresholds when possible to avoid BACT.',
    tags: ['permitting', 'emissions', 'bact', 'economics']
  },
  {
    front: 'What is methane slip and why does it matter for gas engine emissions?',
    back: '**Methane Slip:** Unburned methane (CH₄) that passes through the engine and exits in the exhaust without being combusted.\n\n**Causes:**\n• Lean-burn engines intentionally run fuel-lean for NOx reduction → some methane doesn\'t ignite\n• Methane in crevice volumes (between piston and cylinder wall)\n• Valve overlap periods → raw fuel passes through\n• Low-load operation → incomplete combustion\n\n**Why it matters:**\n• Methane is a potent greenhouse gas: **28-84x CO₂ warming potential** (depending on timeframe)\n• Regulations increasingly target methane (EPA Methane Rule, IRA provisions)\n• Can significantly worsen the lifecycle GHG footprint of gas generation\n• Typical slip: 1-3% of fuel input for lean-burn recips\n\n**Mitigation:**\n• Rich-burn engines with NSCR have near-zero methane slip\n• Oxidation catalysts (limited effectiveness for CH₄ — need high temp catalyst)\n• Pre-chamber ignition technology (Wärtsilä, INNIO) reduces slip\n• Engine tuning and higher combustion temperature (tradeoff with NOx)\n\n**Impact on carbon accounting:** Methane slip can add 5-15% to the CO₂-equivalent emissions of a gas plant.',
    tags: ['emissions', 'methane', 'greenhouse-gas']
  },
  {
    front: 'What is AERMOD and when is it required for gas generation permitting?',
    back: '**AERMOD:** EPA\'s preferred atmospheric dispersion model for regulatory air quality assessments.\n\n**What it does:**\n• Models how pollutant concentrations disperse from a source (stack) across the surrounding area\n• Accounts for meteorology, terrain, building downwash, receptor locations\n• Predicts maximum ground-level concentrations at property boundaries and sensitive receptors\n\n**When required:**\n• PSD (Prevention of Significant Deterioration) permit applications — mandatory\n• State NSR permits — often required for projects near NAAQS limits\n• Environmental Impact Statements (EIS)\n• When a permitting authority requests demonstration of ambient air quality compliance\n\n**Key inputs:**\n• Stack parameters (height, diameter, exit velocity, temperature)\n• Emission rates (lb/hr for each pollutant)\n• 5 years of hourly meteorological data (from nearest NWS station)\n• Terrain data (USGS elevation)\n• Building dimensions (for downwash)\n\n**Output:** Predicted concentrations (µg/m³) compared against NAAQS (National Ambient Air Quality Standards)\n\n**Timeline:** Modeling + review typically adds 3-6 months to permitting.',
    tags: ['permitting', 'emissions', 'modeling']
  },
];

// ── SET 8: Vendor Vetting & Procurement ──
const set8 = [
  {
    front: 'What are the key performance guarantees to negotiate in a gas generation EPC/equipment contract?',
    back: '**Performance guarantees the vendor must warrant:**\n\n1. **Net Power Output** — guaranteed MW at reference conditions (ISO: 59°F, sea level, 60% RH)\n   • Tolerance: typically ±2%\n   • Test method: ASME PTC 22 (gas turbines), PTC 17 (recips)\n\n2. **Heat Rate** — guaranteed BTU/kWh at reference conditions\n   • Tolerance: ±2%\n   • Drives lifetime fuel cost — 1% heat rate difference = millions over project life\n\n3. **Availability** — guaranteed % of time the unit is available to run\n   • Typical: 92-97%\n   • Excludes planned maintenance windows\n\n4. **Emissions** — guaranteed NOx, CO, PM at rated load\n   • Must meet permit limits with margin\n\n5. **Start reliability** — % of successful starts on demand\n   • Critical for peaking/emergency duty\n\n**Liquidated Damages (LDs):**\n• Pre-agreed financial penalties if guarantees aren\'t met\n• Typically 5-15% of contract value cap\n• Structure: $/kW shortfall, $/BTU/kWh excess, $/% availability shortfall\n\n**Test conditions:** All guarantees corrected to ISO reference conditions using agreed correction curves.',
    tags: ['procurement', 'contracts', 'performance-guarantees']
  },
  {
    front: 'What is FAT vs. SAT in power generation equipment procurement?',
    back: '**FAT (Factory Acceptance Test):**\n• Performed at the manufacturer\'s facility before shipment\n• Verifies equipment meets specifications under controlled conditions\n• Owner/engineer witnesses key tests\n\n**Typical FAT scope:**\n• Generator: insulation resistance, winding resistance, short circuit, open circuit\n• Switchgear: breaker operation, relay settings, wiring verification\n• Engine/turbine: performance test on test bed (if available)\n• Control system: logic verification, alarm/trip testing, HMI review\n\n**SAT (Site Acceptance Test):**\n• Performed after installation at the project site\n• Verifies equipment works correctly in the actual installation environment\n• Includes integration with all BoP systems\n\n**Typical SAT scope:**\n• First fire and initial operation\n• Performance verification (heat rate, power output)\n• Emissions compliance testing (stack test)\n• Protection system testing (relay injection, trip tests)\n• Load rejection test, black start test\n• 72-168 hour reliability run\n\n**Key:** FAT issues are cheaper and faster to fix. Never skip FAT to save time — problems found at SAT are 5-10x more expensive to resolve.',
    tags: ['procurement', 'commissioning', 'testing']
  },
  {
    front: 'What is FOR (Forced Outage Rate) and how do you use NERC GADS data to vet vendors?',
    back: '**FOR (Forced Outage Rate):** The percentage of time a generating unit is unavailable due to unplanned failures.\n\n**Formula:** FOR = Forced Outage Hours ÷ (Service Hours + Forced Outage Hours) × 100\n\n**NERC GADS (Generating Availability Data System):**\n• Industry database of actual generating unit performance\n• Covers ~95% of US generating capacity\n• Reports availability, capacity factor, outage causes by unit type and size\n\n**How to use it for vendor vetting:**\n1. Pull GADS benchmarks for the specific technology class (e.g., "Gas Turbine 50-99 MW")\n2. Compare vendor\'s claimed availability against fleet average\n3. Ask vendor for unit-specific GADS data for reference plants\n4. Red flag: vendor claims significantly better than fleet average without explanation\n\n**Typical GADS benchmarks:**\n• Large frame gas turbine: FOR 3-6%, EAF 88-93%\n• Aeroderivative gas turbine: FOR 2-5%, EAF 90-95%\n• Reciprocating engine: FOR 3-8%, EAF 90-96%\n\n**EAF** = Equivalent Availability Factor (accounts for partial outages)\n\n**Key insight:** Past performance data is the best predictor of future reliability. Vendor guarantees are only as good as the LDs backing them.',
    tags: ['procurement', 'vendor-vetting', 'reliability', 'nerc-gads']
  },
  {
    front: 'What are the red flags when vetting a gas generation vendor or EPC contractor?',
    back: '**Equipment vendor red flags:**\n• Heat rate quoted only at ISO conditions with no site-specific corrections\n• Availability guarantee without defining forced vs. planned outage\n• Won\'t provide GADS data or reference plant operating history\n• LTSA pricing "TBD" or subject to escalation without caps\n• No clear parts supply chain for the installed region\n• Single-source components with no alternatives\n\n**EPC contractor red flags:**\n• No experience with this specific technology at this scale\n• Schedule doesn\'t account for permitting/interconnection lead times\n• Lump-sum price with excessive exclusions in fine print\n• Won\'t provide performance bond or parent guarantee\n• Subcontracts all critical scope (electrical, controls) with no oversight plan\n• Change order history on past projects > 15% of original contract\n\n**Financial red flags:**\n• Vendor/EPC has thin balance sheet relative to project size\n• LD cap is too low to be meaningful (< 5% of contract)\n• Retainage terms too generous (release before commissioning complete)\n• Payment schedule front-loaded (> 40% before equipment ships)\n\n**Always:** Visit reference sites, talk to other owners without the vendor present, check litigation history.',
    tags: ['procurement', 'vendor-vetting', 'risk']
  },
];

async function main() {
  // Create topic
  const topic = await post('/api/topics', {
    name: 'Natural Gas → Electricity',
    description: 'Gas-fired power generation: thermodynamics, RICE engines, gas turbines, CHP/HRSG, pipeline/fuel supply, electrical BoP, emissions permitting, and vendor procurement.',
    color: '#dc2626',
    icon: 'book'
  });
  console.log('Created topic:', topic.id, topic.name);

  const setDefs = [
    { name: '1. Gas Generation Fundamentals', desc: 'Heat rate, fuel characteristics, start-up types, degradation, CapEx/OpEx, dispatch profiles, Brayton cycle.', cards: set1 },
    { name: '2. Reciprocating Engines (RICE)', desc: 'When RICE beats turbines, overhaul intervals, turbocharging, derating, emissions controls, LTSA, control systems.', cards: set2 },
    { name: '3. Gas Turbines', desc: 'Aero vs heavy-frame, compressor surge/stall, hot gas path, CCGT, Mark VIe controls, DLN combustion tuning.', cards: set3 },
    { name: '4. CHP / Cogeneration / HRSG', desc: 'CHP economics for data centers, HRSG operation, backpressure vs condensing steam turbines.', cards: set4 },
    { name: '5. Pipeline & Gas Supply', desc: 'MAOP, Wobbe Index, pressure reduction stations, gas lateral sizing for 15-50 MW plants.', cards: set5 },
    { name: '6. Electrical Balance of Plant', desc: 'BoP components, generator synchronization, arc flash studies, coordination studies.', cards: set6 },
    { name: '7. Emissions & Air Permitting', desc: 'Title V vs Minor NSR, BACT analysis, methane slip, AERMOD dispersion modeling.', cards: set7 },
    { name: '8. Vendor Vetting & Procurement', desc: 'Performance guarantees, LDs, FAT/SAT testing, NERC GADS benchmarking, vendor red flags.', cards: set8 },
  ];

  let total = 0;
  for (const s of setDefs) {
    const cardSet = await post('/api/topics/' + topic.id + '/sets', { name: s.name, description: s.desc });
    console.log('Created set:', cardSet.name, `(${s.cards.length} cards)`);

    for (const c of s.cards) {
      await post('/api/sets/' + cardSet.id + '/cards', {
        tags: c.tags,
        front: { media_blocks: [{ block_type: 'text', text_content: c.front }] },
        back: { media_blocks: [{ block_type: 'text', text_content: c.back }] }
      });
      total++;
    }
  }

  console.log(`\nDone! Created ${total} flashcards across ${setDefs.length} sets in topic "Natural Gas → Electricity"`);
}

main().catch(e => console.error('Error:', e));
