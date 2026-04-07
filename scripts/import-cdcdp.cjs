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

// ---------- UNIT 1: Power to the Data Centre ----------
const unit1 = [
  {
    front: 'What are the typical voltage levels for utility power feeds into a data centre in Europe and North America?',
    back: '**Europe:** 10kV, 20kV, or 33kV medium voltage (MV) feeds from the utility, stepped down via on-site transformers to 400V three-phase for distribution.\n\n**North America:** 13.8kV, 23kV, or 34.5kV utility feeds, stepped down to 480V three-phase (or 208V for smaller facilities).\n\nLarger data centres (>10MW) often take supply at high voltage (66kV-132kV) with dedicated on-site substations to reduce transmission losses and improve reliability.',
    tags: ['power-supply', 'voltage', 'utility']
  },
  {
    front: 'What is an N+1 power feed arrangement, and how does it differ from 2N?',
    back: '**N+1:** One additional redundant component beyond the minimum needed (N) to support the load. If 3 UPS units are needed, 4 are installed. A single failure is tolerated but capacity is shared.\n\n**2N:** Fully duplicated power path. Two completely independent systems, each capable of supporting 100% of the load. No single point of failure across the entire chain.\n\n**2(N+1):** Two independent paths, each with N+1 redundancy within them. Highest level of resilience.\n\nUptime Institute Tier III requires N+1 concurrent maintainability; Tier IV requires 2N fault tolerance.',
    tags: ['power-supply', 'redundancy', 'uptime-tiers']
  },
  {
    front: 'What is the role of a step-down transformer in data centre power distribution?',
    back: 'Step-down transformers reduce high/medium voltage utility supply to usable distribution voltages within the data centre.\n\n**Typical conversions:**\n- MV (11kV/33kV) to LV (400V/480V) for main distribution\n- 480V to 208V/120V for IT equipment (North America)\n- 400V to 230V for IT equipment (Europe)\n\n**Key specifications:**\n- **Impedance:** Typically 5-6% (limits fault current)\n- **Winding configuration:** Delta-wye (Dyn11) is standard, providing neutral for single-phase loads and blocking triplen harmonics\n- **Cooling:** ONAN (oil), AN (dry-type, preferred in data centres for fire safety)\n- **K-rating:** K-13 or K-20 rated for non-linear IT loads with high harmonic content',
    tags: ['power-supply', 'transformer', 'voltage']
  },
  {
    front: 'What types of surge protection devices (SPDs) are used in data centres, and where are they installed?',
    back: '**Type 1 (Class I):** Installed at the service entrance / main switchboard. Protects against direct lightning strikes and high-energy transients (10/350 microsecond waveform). Typically MOV or spark-gap based.\n\n**Type 2 (Class II):** Installed at sub-distribution boards and UPS inputs. Protects against indirect surges and switching transients (8/20 microsecond waveform).\n\n**Type 3 (Class III):** Installed at final distribution (PDUs, RPPs) close to sensitive IT equipment. Fine protection against residual surges.\n\n**Cascaded approach:** All three types work together. Each stage clamps the surge to a lower level, with coordination between devices ensuring proper sequencing. IEC 62305 and EN 62305 govern lightning protection design.',
    tags: ['power-supply', 'surge-protection', 'standards']
  },
  {
    front: 'What is the purpose of switchgear in a data centre, and what are the main types?',
    back: 'Switchgear provides switching, protection, and isolation of electrical circuits. It is the first major distribution point after the utility transformer.\n\n**Main types:**\n- **Medium Voltage (MV) Switchgear:** 11kV-36kV, uses vacuum or SF6 circuit breakers. Located between utility and step-down transformers.\n- **Low Voltage (LV) Switchgear:** 400V/480V, uses air circuit breakers (ACBs) or moulded case circuit breakers (MCCBs). Main distribution after transformers.\n\n**Key features:**\n- Arc-flash rated enclosures (IEC 62271)\n- Bus-tie breakers for source transfer between feeds\n- Metering and protection relays (overcurrent, earth fault, differential)\n- Draw-out breakers for maintenance without shutdown\n\n**2025 note:** Digital switchgear with IEC 61850 communication is now standard for DCIM integration and predictive maintenance.',
    tags: ['power-supply', 'switchgear', 'distribution']
  },
  {
    front: 'What is power factor, and why does it matter in data centre design?',
    back: '**Power Factor (PF)** is the ratio of real power (kW) to apparent power (kVA). It measures how effectively electrical power is converted into useful work.\n\n**PF = kW / kVA = cos(theta)**\n\n**Why it matters:**\n- Low PF means higher current for the same real power, increasing losses and requiring larger cables, transformers, and switchgear\n- Utilities penalise power factors below 0.9 or 0.95 with surcharges\n- Upstream infrastructure must be sized for kVA, not kW\n\n**Modern IT equipment:** Server PSUs typically achieve PF > 0.99 with active PFC (Power Factor Correction). The 80 PLUS Titanium standard requires PF >= 0.95 at all load levels.\n\n**UPS impact:** Modern double-conversion UPS units have unity (1.0) output power factor, meaning kW = kVA rating.',
    tags: ['power-supply', 'power-factor', 'efficiency']
  },
  {
    front: 'What is the difference between a ring main and a radial power distribution topology?',
    back: '**Radial topology:**\n- Power flows in one direction from source to load\n- Simple, lower cost, easy to understand\n- Single point of failure: a fault anywhere interrupts downstream loads\n- Common in smaller facilities or within a single redundancy path\n\n**Ring main topology:**\n- Power distribution forms a loop with multiple feed points\n- Any section can be isolated while maintaining supply via the alternate path\n- More complex protection coordination required (directional relays)\n- Higher cost but greater resilience\n\n**Data centre preference:** Most Tier III/IV facilities use radial topology with redundant parallel paths (2N) rather than ring mains. The simplicity of radial paths makes fault isolation more predictable. Ring mains are more common in campus-style deployments between buildings.',
    tags: ['power-supply', 'topology', 'distribution']
  },
  {
    front: 'What is a Automatic Transfer Switch (ATS) in data centre power architecture?',
    back: 'An ATS automatically transfers the electrical load from a primary power source to a secondary source (typically a generator) when it detects a failure or out-of-specification condition on the primary.\n\n**Key specifications:**\n- **Transfer time:** Open transition (break-before-make) typically 100-500ms; closed transition (make-before-break) for zero-interruption\n- **Sensing:** Monitors voltage, frequency, and phase on both sources\n- **Ratings:** Must handle full load current plus inrush\n\n**Types:**\n- **Open transition:** Brief interruption during transfer (UPS bridges the gap)\n- **Closed transition:** Momentary parallel of sources, no interruption\n- **Static Transfer Switch (STS):** Solid-state, transfers in <4ms quarter-cycle, used downstream for critical loads\n\nATS is typically located between utility/generator feeds and the UPS input.',
    tags: ['power-supply', 'ATS', 'redundancy']
  },
  {
    front: 'What are the key considerations when designing utility power intake for a data centre?',
    back: '**Capacity planning:**\n- Size for Day 1 load plus planned growth (typically 5-10 year horizon)\n- Account for PUE overhead: if IT load is 10MW and PUE is 1.3, total intake is 13MW\n- Diversity factor: not all equipment runs at full load simultaneously\n\n**Resilience:**\n- Dual utility feeds from independent substations / feeders\n- Diverse cable routes (physically separated paths)\n- On-site generation for extended outages\n\n**Power quality:**\n- Harmonic distortion limits (IEEE 519: THD < 5% at PCC)\n- Voltage regulation (+/- 10% per EN 50160)\n- Frequency stability\n\n**Commercial:**\n- Long lead times for new HV connections (12-36 months in many markets)\n- Power purchase agreements (PPAs) for renewable energy\n- 2025: Grid capacity constraints are a major bottleneck for new DC builds, especially near AI/HPC demand centres',
    tags: ['power-supply', 'design', 'capacity']
  },
  {
    front: 'What is the role of harmonic filtering in data centre power systems?',
    back: '**The problem:** Non-linear loads (IT power supplies, UPS rectifiers, VFDs) draw current in pulses rather than smooth sine waves, creating harmonic currents (3rd, 5th, 7th, etc.).\n\n**Effects of harmonics:**\n- Overheating of transformers and neutral conductors (triplen harmonics)\n- Increased losses in cables and switchgear\n- Nuisance tripping of circuit breakers\n- Interference with sensitive monitoring equipment\n\n**Solutions:**\n- **Passive filters:** LC tuned circuits at specific harmonic frequencies, installed at major non-linear loads\n- **Active filters:** Electronic devices that inject counter-harmonic currents in real-time, more flexible but costlier\n- **12/18/24-pulse rectifiers:** In UPS and VFDs, reduce harmonic generation at source\n- **K-rated transformers:** Designed to handle harmonic heating (K-13, K-20)\n\n**Standard:** IEEE 519 limits THD to <5% at the point of common coupling (PCC).',
    tags: ['power-supply', 'harmonics', 'power-quality']
  }
];

// ---------- UNIT 2: Distribution in the Data Centre ----------
const unit2 = [
  {
    front: 'What is the role of a Power Distribution Unit (PDU) in a data centre?',
    back: 'A PDU transforms and distributes power from the main switchboard to the IT racks. In data centre terminology, "PDU" can refer to two different things:\n\n**Floor-standing PDU (also called Power Distribution Board):**\n- Steps down voltage (e.g., 480V to 208V, or 400V to 230V)\n- Contains transformer, breakers, monitoring, and output circuits\n- Feeds multiple racks via branch circuits\n- Typical capacity: 75kVA to 500kVA+\n\n**Rack-mounted PDU (in-rack power strip):**\n- Distributes power within a rack to individual servers\n- May include metering, switching, outlet-level monitoring\n- Types: basic, metered, monitored, switched, intelligent\n\n**2025 standard:** Intelligent rack PDUs with per-outlet power monitoring, environmental sensors, and network connectivity (SNMP/REST API) for DCIM integration are the norm.',
    tags: ['distribution', 'PDU', 'equipment']
  },
  {
    front: 'What is a Remote Power Panel (RPP) and when is it used?',
    back: 'An RPP is a secondary distribution panel that takes a single large feed from the floor PDU and breaks it into multiple branch circuits for individual racks.\n\n**Characteristics:**\n- No transformer (unlike a PDU) -- purely a distribution panel\n- Contains circuit breakers (typically 20A-63A per pole)\n- Installed close to the racks it serves to minimise cable runs\n- Typically serves 10-20 racks\n\n**When used:**\n- In large data halls where running individual circuits from a central PDU would require excessively long cable runs\n- When the floor PDU is remote from the IT load area\n- To provide localised circuit protection and isolation\n\n**Monitoring:** Modern RPPs include branch circuit monitoring (BCMS) that reports per-circuit current, voltage, power, and energy to the DCIM system.',
    tags: ['distribution', 'RPP', 'equipment']
  },
  {
    front: 'How do you calculate IT load power requirements for a data centre?',
    back: '**Step 1 -- Nameplate vs actual load:**\nServer nameplate ratings significantly overstate actual consumption. Typical utilisation is 40-70% of nameplate.\n\n**Step 2 -- Per-rack power:**\n- Legacy enterprise: 4-8 kW/rack\n- Modern enterprise: 10-15 kW/rack\n- High-density compute: 20-30 kW/rack\n- AI/GPU racks (2025): 40-100+ kW/rack (NVIDIA DGX H100 = ~10kW per node, 8 nodes/rack = ~80kW)\n\n**Step 3 -- Total IT load:**\nNumber of racks x average kW per rack = Total IT load (kW)\n\n**Step 4 -- Total facility power:**\nTotal IT load x PUE = Total facility power\nExample: 1000 racks x 15kW x 1.3 PUE = 19.5MW total\n\n**Step 5 -- Growth allowance:**\nSize infrastructure for planned capacity, but deploy modularly to avoid stranded power.',
    tags: ['distribution', 'capacity-planning', 'power-density']
  },
  {
    front: 'What is stranded power, and how is it avoided?',
    back: '**Stranded power** is provisioned electrical capacity that is installed and paid for but cannot be utilised by IT equipment due to design constraints.\n\n**Common causes:**\n- Over-provisioned UPS or PDUs serving under-utilised racks\n- Uneven load distribution across redundant paths (one path near capacity, the other lightly loaded)\n- Circuit breaker derating (80% continuous load rule) consuming paper capacity\n- Cooling limitations preventing power capacity from being fully used\n- Mismatched phases causing neutral overload before phases are fully loaded\n\n**Avoidance strategies:**\n- Modular, scalable deployment (add capacity as needed)\n- Right-sized PDUs and UPS modules\n- Intelligent PDUs with real-time monitoring to identify underutilised circuits\n- DCIM capacity management tools that track provisioned vs actual vs available power\n- Regular power audits and load balancing\n\n**Impact:** Stranded power directly reduces the facility\'s return on investment -- infrastructure cost is incurred but revenue-generating IT capacity is not realised.',
    tags: ['distribution', 'stranded-power', 'efficiency']
  },
  {
    front: 'What is the 80% derating rule for circuit breakers, and how does it affect data centre design?',
    back: '**The rule:** Per NEC Article 210.20 (and similar standards globally), circuit breakers serving continuous loads (running for 3+ hours) must be derated to 80% of their rated capacity.\n\n**Example:** A 20A breaker can only be loaded to 16A continuously. A 30A breaker is limited to 24A.\n\n**Impact on design:**\n- A 20A, 208V single-phase circuit: nameplate = 4,160W, but usable = 3,328W\n- Must provision 25% more circuits than a raw calculation suggests\n- Contributes to stranded power if not properly accounted for\n\n**Exceptions:**\n- Some breakers are rated for 100% continuous duty (marked accordingly), but they are more expensive and larger\n- Three-phase circuits provide better utilisation of conductor capacity\n\n**Design practice:** Always calculate branch circuit counts using the derated value, not the full breaker rating.',
    tags: ['distribution', 'circuit-protection', 'NEC']
  },
  {
    front: 'What is the difference between single-cord and dual-cord power distribution to IT equipment?',
    back: '**Single-cord (1N):**\n- Server has one power supply connected to one power feed\n- Relies entirely on one distribution path\n- Lower cost, simpler cabling\n- Any upstream failure causes IT equipment to lose power\n\n**Dual-cord (2N):**\n- Server has two power supplies, each connected to an independent power path (A feed + B feed)\n- Each path has its own utility feed, ATS, UPS, PDU, and distribution\n- If one entire path fails, the other sustains the load\n- Requires dual-corded IT equipment (standard for enterprise servers)\n\n**Design consideration:** Each power path in a 2N arrangement must be sized to carry 100% of the IT load, but under normal conditions each path carries only ~50%. This means UPS and PDU utilisation appears low (50%) by design.\n\n**Single-cord mitigation:** For single-corded equipment, a Static Transfer Switch (STS) can provide automatic failover between two feeds.',
    tags: ['distribution', 'redundancy', 'dual-cord']
  },
  {
    front: 'What is power factor correction (PFC) and where is it applied in a data centre?',
    back: '**Power Factor Correction** improves the power factor of a load by adding reactive power compensation, reducing the apparent power (kVA) drawn from the utility.\n\n**Methods:**\n- **Capacitor banks:** Traditional PFC, installed at switchboard level. Capacitors supply leading reactive power to offset lagging inductive loads (motors, transformers).\n- **Active PFC in server PSUs:** Electronic circuit in each power supply that shapes input current to be sinusoidal and in phase with voltage. Modern server PSUs achieve PF > 0.99.\n- **Active harmonic filters:** Combine PFC with harmonic mitigation.\n\n**Where applied:**\n- At utility intake (to avoid utility penalties)\n- At UPS input (if upstream PF is poor)\n- At each server PSU (built-in active PFC, mandated by 80 PLUS)\n\n**2025 reality:** Because modern IT loads have near-unity PF, centralized PFC banks are less necessary than a decade ago. The main lagging loads are now mechanical systems (chillers, pumps, fans) rather than IT.',
    tags: ['distribution', 'power-factor', 'efficiency']
  },
  {
    front: 'What is busbar trunking (busway), and what are its advantages over cable distribution?',
    back: '**Busbar trunking** is a prefabricated power distribution system using copper or aluminium busbars enclosed in a protective housing, with tap-off points at regular intervals.\n\n**Advantages over cables:**\n- **Flexibility:** Tap-off boxes can be added, moved, or removed without shutting down the busway\n- **Speed of deployment:** Pre-engineered sections bolt together quickly\n- **Space efficiency:** Overhead busway frees up floor space vs. cable trays\n- **Lower losses:** Larger conductor cross-section and shorter runs reduce voltage drop\n- **Scalability:** Add IT racks and tap off power where needed\n\n**Typical application:**\n- Overhead busway running above hot aisle, with tap-off boxes dropping power to each rack\n- Rated from 40A to 6300A depending on application\n\n**Considerations:**\n- Higher upfront cost than cable\n- Requires structural support for weight\n- Must maintain IP rating at all tap-off points\n\n**Standards:** IEC 61439-6 for busbar trunking systems.',
    tags: ['distribution', 'busway', 'cabling']
  },
  {
    front: 'What is the difference between a static transfer switch (STS) and an automatic transfer switch (ATS)?',
    back: '**Automatic Transfer Switch (ATS):**\n- Electromechanical device with motorised contacts\n- Transfer time: 100-500ms (open transition) or ~0ms (closed transition)\n- Used at utility/generator changeover (upstream of UPS)\n- Handles high currents (800A-4000A+)\n- Lower cost per amp\n\n**Static Transfer Switch (STS):**\n- Solid-state device using thyristors (SCRs)\n- Transfer time: <4ms (quarter cycle) -- within IT equipment ride-through\n- Used downstream to provide dual-feed capability for single-cord IT loads\n- Typical ratings: 30A-800A\n- More expensive, generates more heat, requires cooling\n\n**Key distinction:** ATS is for upstream source selection (utility/generator). STS is for downstream load protection, enabling single-corded equipment to benefit from 2N distribution.\n\n**Limitation of STS:** Adds another potential single point of failure and complexity. Most modern data centres prefer dual-corded equipment over STS where possible.',
    tags: ['distribution', 'STS', 'ATS', 'redundancy']
  },
  {
    front: 'How should three-phase power be balanced across IT racks?',
    back: '**Why balance matters:**\n- Unbalanced phases cause neutral current to flow (even with balanced voltages)\n- Excessive neutral current causes overheating of neutral conductors and transformer windings\n- With non-linear loads, triplen harmonics (3rd, 9th, 15th) add in the neutral rather than cancelling\n- Derating of transformer and UPS capacity\n\n**Best practices:**\n- Distribute rack feeds evenly across all three phases (L1, L2, L3)\n- Monitor per-phase loading at PDU and RPP levels\n- Target phase imbalance < 20% (ideally < 10%)\n- Use three-phase rack PDUs where possible (they inherently help balance)\n- Regular load audits to catch drift as equipment is added/removed\n\n**Neutral sizing:**\n- In data centres with high harmonic content, the neutral conductor should be rated at 1.5x to 2x the phase conductor size\n- Or use separate neutrals per phase (eliminates shared neutral issue)',
    tags: ['distribution', 'three-phase', 'load-balancing']
  }
];

// ---------- UNIT 3: Standby Power ----------
const unit3 = [
  {
    front: 'What are the main types of UPS topology used in data centres?',
    back: '**1. Online Double Conversion (VFI -- Voltage & Frequency Independent):**\n- All power passes through rectifier then inverter continuously\n- Complete isolation from mains disturbances\n- Zero transfer time to battery\n- Highest protection level; standard for Tier III/IV\n- Efficiency: 94-97% (in double conversion mode)\n\n**2. Line-Interactive (VI):**\n- Autotransformer regulates voltage; inverter only activates on mains failure\n- 2-4ms transfer time\n- Better efficiency (~97%) but less protection\n- Suitable for edge/small deployments\n\n**3. Offline/Standby (VFD):**\n- Load runs directly on mains; UPS switches to battery on failure\n- 5-12ms transfer time\n- Not suitable for data centres\n\n**4. Rotary UPS:**\n- Diesel engine + flywheel + alternator in one unit (DRUPS)\n- No batteries required (flywheel bridges until diesel starts)\n- Very high efficiency, high power density\n- Complex, large footprint, requires fuel storage\n\n**2025 trend:** Modular UPS (hot-swappable N+1 modules in a single frame) is dominant for scalability.',
    tags: ['standby-power', 'UPS', 'topology']
  },
  {
    front: 'What battery technologies are used in modern data centre UPS systems?',
    back: '**Valve-Regulated Lead-Acid (VRLA):**\n- Traditional choice; lower upfront cost\n- Lifespan: 5-10 years (design life), often less in practice\n- Heavy, large footprint\n- Sensitive to temperature (every 10C above 25C halves life)\n- Being replaced in new builds\n\n**Lithium-Ion (Li-ion):**\n- **Now the dominant choice for new data centre UPS (2025)**\n- 2-3x longer lifespan (15-20 years)\n- 60-80% smaller and lighter than equivalent VRLA\n- Higher charge/discharge rates; better performance at partial loads\n- Higher upfront cost but lower TCO over lifecycle\n- Requires Battery Management System (BMS) for safety\n- Chemistries: LFP (LiFePO4) preferred for safety; NMC for energy density\n\n**Nickel-Zinc (NiZn):**\n- Emerging alternative; no thermal runaway risk\n- Fewer charge cycles than Li-ion\n\n**Flywheel (kinetic):**\n- 15-30 seconds of ride-through\n- No chemical degradation; 20+ year life\n- Paired with generators (no extended runtime)\n\n**Supercapacitors:** Ultra-short runtime (seconds), used with fast-start generators.',
    tags: ['standby-power', 'batteries', 'lithium-ion']
  },
  {
    front: 'What is a DRUPS (Diesel Rotary Uninterruptible Power Supply)?',
    back: '**DRUPS** combines a diesel engine, electric motor/generator, and kinetic energy storage (flywheel or coupling) into a single integrated unit.\n\n**How it works:**\n1. Normal operation: Mains power drives the motor, which spins the flywheel and generator. Load is supplied via the generator.\n2. On mains failure: Flywheel kinetic energy sustains the generator for 8-15 seconds while the diesel engine starts and takes over.\n3. No batteries required for bridging.\n\n**Advantages:**\n- Very high efficiency (95-98%) -- no double-conversion losses\n- No battery replacement costs or chemical waste\n- Long operational life (25+ years)\n- Single device replaces UPS + generator\n\n**Disadvantages:**\n- Large physical footprint and weight\n- Noise and vibration (requires structural isolation)\n- Complex mechanical maintenance\n- Fuel storage and emissions regulations apply\n\n**Common brands:** Hitec Power Protection (UNIBLOCK), Piller, Hitzinger.\n**Used by:** Many hyperscale operators (e.g., some Microsoft Azure facilities).',
    tags: ['standby-power', 'DRUPS', 'generator']
  },
  {
    front: 'What are the key design considerations for standby diesel generators in data centres?',
    back: '**Sizing:**\n- Must support full IT load + cooling + lighting + ancillaries\n- Account for transient loads (motor starting, UPS recharge)\n- Avoid running below 30% load (wet stacking / carbon buildup)\n\n**Redundancy:** N+1 minimum; Tier IV requires 2N\n\n**Fuel:**\n- Diesel: most common, typically 24-72 hour on-site storage\n- **HVO (Hydrotreated Vegetable Oil):** Drop-in diesel replacement, 90% fewer CO2 emissions, no engine modifications needed. Increasingly mandated for sustainability.\n- Natural gas: lower emissions but complex fuel supply assurance\n\n**Start time:** Must reach rated voltage and frequency within 10-15 seconds\n\n**Testing:**\n- Monthly no-load test runs\n- Annual full-load bank testing\n- Transfer test with actual building load\n\n**Emissions:** Must comply with EPA Tier 4 (US) or EU Stage V emissions standards. Selective Catalytic Reduction (SCR) or Diesel Particulate Filters (DPF) may be required.\n\n**2025 trend:** Battery energy storage systems (BESS) complementing or replacing short-runtime generators for grid-interactive operation.',
    tags: ['standby-power', 'generators', 'fuel', 'HVO']
  },
  {
    front: 'What is the difference between an ATS open transition and a closed transition transfer?',
    back: '**Open Transition (Break-Before-Make):**\n- Disconnects from Source 1, brief dead period, then connects to Source 2\n- Typical transfer time: 100-500ms\n- The UPS battery bridges this gap seamlessly\n- Simpler, lower cost\n- No risk of paralleling sources\n- Most common type in data centres\n\n**Closed Transition (Make-Before-Break):**\n- Briefly parallels both sources (typically <100ms) before disconnecting the first\n- Zero interruption to the load\n- Requires sources to be synchronised (matched voltage, frequency, phase angle)\n- More complex controls and protection\n- Risk: if sources cannot synchronise, must fall back to open transition\n\n**Delayed Transition:**\n- Intentional delay between disconnect and reconnect\n- Ensures complete isolation (no backfeed)\n- Used where utility requires proof of isolation before generator paralleling\n\n**Selection:** Open transition with online UPS is the most common data centre approach -- the UPS makes the transfer time irrelevant to IT loads.',
    tags: ['standby-power', 'ATS', 'transfer']
  },
  {
    front: 'What is UPS efficiency, and why is "eco-mode" controversial in data centres?',
    back: '**UPS efficiency** is the ratio of output power to input power. Energy lost as heat increases cooling load and operating cost.\n\n**Typical efficiencies (double-conversion):**\n- Legacy UPS: 90-93%\n- Modern UPS: 95-97%\n- At partial loads (20-40%): efficiency drops significantly\n\n**Eco-mode (bypass mode):**\n- UPS passes utility power directly to load, bypassing the inverter\n- Efficiency jumps to 98-99%\n- Inverter stays synchronised and ready for instant transfer on mains failure\n\n**The controversy:**\n- Transfer to inverter takes 2-4ms (within ITIC/CBEMA curve tolerance)\n- But: some transients may not be caught; load is exposed to raw mains power quality\n- Some operators had outages during eco-mode transfers\n- **Uptime Institute Tier certification does not accept eco-mode as the normal operating mode**\n\n**2025 status:** "Advanced eco-mode" or "high-efficiency mode" with <1ms transfer times and partial inverter filtering has made eco-mode more acceptable. Many hyperscalers use it.\n\n**Savings:** On a 10MW facility, 3% efficiency gain = ~300kW = ~$200K/year in electricity.',
    tags: ['standby-power', 'UPS', 'efficiency', 'eco-mode']
  },
  {
    front: 'How are modular UPS systems designed, and what are their advantages?',
    back: '**Architecture:** Multiple UPS power modules installed in a common frame/cabinet, sharing a static bypass switch and control system.\n\n**Typical configuration:**\n- Frame: 250kW-1.5MW total capacity\n- Modules: 25kW-250kW each, hot-swappable\n- N+1 redundancy by adding one extra module\n\n**Advantages:**\n- **Scalability:** Start with 2-3 modules, add more as load grows\n- **Efficiency:** Intelligent load sharing keeps modules at optimal loading (sweet spot 50-75%)\n- **Maintenance:** Failed module can be replaced without affecting load (hot-swap in minutes, not hours)\n- **Reduced stranded capacity:** Matches UPS capacity closely to actual load\n- **Footprint:** Smaller than equivalent monolithic UPS\n\n**Disadvantages:**\n- Common bypass switch is still a single point of failure\n- More complex control system\n- Module interoperability requires same vendor/generation\n\n**Leading vendors (2025):** Schneider (Galaxy series), Vertiv (Liebert), ABB, Eaton, Huawei (FusionPower).\n\n**Trend:** Li-ion battery modules integrated directly into the UPS frame rather than separate battery cabinets.',
    tags: ['standby-power', 'UPS', 'modular']
  },
  {
    front: 'What is the typical UPS runtime and how is battery bank capacity calculated?',
    back: '**Typical runtimes:**\n- With on-site generators: 5-15 minutes (just enough for generator start + stabilisation + ATS transfer)\n- Without generators: 30-60+ minutes (rare in modern facilities)\n- Flywheel systems: 10-30 seconds (generator must start within this window)\n\n**Battery sizing calculation:**\n\n**Energy required (Wh) = Load (kW) x Runtime (hours) x 1000**\n\n**Battery capacity (Ah) = Energy / (Battery voltage x Efficiency x Aging factor)**\n\n**Key factors:**\n- **End-of-discharge voltage:** Batteries cannot discharge to 0V; minimum voltage limits usable capacity\n- **Temperature derating:** Capacity decreases at lower temperatures\n- **Aging factor:** VRLA loses ~20% capacity over design life; size for end-of-life capacity\n- **Efficiency:** Battery discharge efficiency (~95% for Li-ion, ~85% for VRLA)\n- **Recharge time:** Must fully recharge before next outage (typically 4-8 hours)\n\n**2025 practice:** Li-ion batteries with integral BMS provide more predictable state-of-health monitoring, reducing over-provisioning margins.',
    tags: ['standby-power', 'batteries', 'sizing']
  },
  {
    front: 'What is wet stacking in diesel generators, and how is it prevented?',
    back: '**Wet stacking** is the accumulation of unburned fuel, carbon, and lubricating oil in the exhaust system of a diesel engine, caused by running at low load for extended periods.\n\n**Cause:** At loads below ~30% of rated capacity, combustion temperatures are too low to completely burn fuel. Unburned hydrocarbons condense in the exhaust manifold, turbocharger, and exhaust stack.\n\n**Symptoms:**\n- Black, oily residue dripping from exhaust\n- Reduced engine performance\n- Increased emissions\n- Potential exhaust fire risk\n\n**Prevention:**\n- Never run generators below 30% load for extended periods\n- Use resistive load banks during testing to apply sufficient load\n- Ensure generator sizing is appropriate (not oversized for actual load)\n- Regular maintenance and exhaust system inspection\n- Modern electronic fuel injection helps but does not eliminate the issue\n\n**Design consideration:** In 2N configurations where each generator is sized for 100% load but normally carries 50%, ensure regular load bank exercises maintain engine health.',
    tags: ['standby-power', 'generators', 'maintenance']
  },
  {
    front: 'What is the role of a paralleling switchboard in a generator plant?',
    back: '**A paralleling switchboard** synchronises and connects multiple generators to a common bus, then distributes combined power to the facility loads.\n\n**Functions:**\n- **Synchronisation:** Matches voltage, frequency, phase angle, and rotation of each generator before closing its breaker onto the bus\n- **Load sharing:** Distributes real (kW) and reactive (kVAR) power proportionally across running generators\n- **Load management:** Can shed non-critical loads if generator capacity is insufficient\n- **Fault protection:** Isolates faulted generators without affecting others\n\n**Why parallel (vs. isolated generators per load)?**\n- More flexible: any generator can serve any load\n- N+1 redundancy without dedicating specific generators to specific loads\n- Better fuel efficiency: run fewer generators at higher loading\n- Simplified maintenance: take one generator offline while others carry the load\n\n**Protection:**\n- Reverse power relays (prevent motoring)\n- Overcurrent and differential protection\n- Under/over voltage and frequency\n\n**Control:** Modern digital controllers (e.g., DEIF, ComAp, Woodward) provide automatic synchronisation, load sharing, and remote monitoring.',
    tags: ['standby-power', 'generators', 'paralleling']
  }
];

// ---------- UNIT 4: Cooling Fundamentals ----------
const unit4 = [
  {
    front: 'What is the difference between sensible heat and latent heat in data centre cooling?',
    back: '**Sensible heat:** Heat that changes the temperature of a substance without changing its state. You can "sense" it with a thermometer.\n- In data centres: the heat generated by IT equipment that raises air temperature\n- Measured in kW or BTU/h\n- Sensible Heat Ratio (SHR) = sensible cooling / total cooling\n\n**Latent heat:** Heat associated with a change of state (e.g., liquid to vapour) without a temperature change.\n- In data centres: moisture added/removed from the air (humidification/dehumidification)\n- Relevant when outside air is introduced (economiser modes)\n\n**Data centre relevance:**\n- Data centres are predominantly sensible heat loads (SHR = 0.95-1.0)\n- IT equipment generates dry heat with no moisture\n- Comfort cooling systems (designed for people, SHR ~0.7) waste capacity on latent cooling\n- **Precision cooling** (CRAC/CRAH) is designed for high SHR, focusing cooling capacity on temperature control',
    tags: ['cooling', 'thermodynamics', 'sensible-latent']
  },
  {
    front: 'What is the difference between a CRAC and a CRAH unit?',
    back: '**CRAC (Computer Room Air Conditioning):**\n- Contains its own compressor and refrigerant circuit (DX -- Direct Expansion)\n- Self-contained cooling system\n- Capacity: typically 20-150kW per unit\n- Less efficient at partial loads\n- Simpler to install; no external chilled water infrastructure needed\n- Suitable for smaller facilities or edge deployments\n\n**CRAH (Computer Room Air Handler):**\n- Uses chilled water from a central chiller plant (no internal compressor)\n- Contains fan(s) and a chilled water coil\n- Capacity: 30-300kW+ per unit\n- More efficient at partial loads (variable chilled water flow + variable fan speed)\n- Requires external chiller plant, piping, pumps\n- Standard for medium-to-large data centres\n\n**Key difference:** CRAC makes its own cold; CRAH distributes cold from a central plant.\n\n**2025 trend:** EC (Electronically Commutated) fans in CRAH units provide 30-50% energy savings over traditional AC fans through variable speed operation.',
    tags: ['cooling', 'CRAC', 'CRAH', 'equipment']
  },
  {
    front: 'What is hot aisle/cold aisle containment, and why is it important?',
    back: '**Without containment:** Hot exhaust from servers mixes with cold supply air, creating hot spots and requiring the cooling system to supply much colder air than necessary.\n\n**Hot Aisle/Cold Aisle layout:**\n- Racks face alternating directions: front-to-front (cold aisle) and back-to-back (hot aisle)\n- Cold air is supplied to cold aisles; hot exhaust is collected from hot aisles\n\n**Cold Aisle Containment (CAC):**\n- Encloses the cold aisle with doors and roof panels\n- Cold supply air is contained and delivered directly to server intakes\n- Room becomes a hot air return plenum\n- Advantage: simpler fire suppression (sprinklers in open hot space)\n\n**Hot Aisle Containment (HAC):**\n- Encloses the hot aisle with doors and ceiling\n- Hot exhaust is captured and returned directly to cooling units\n- Room remains at comfortable cold temperature\n- Advantage: allows higher return air temperatures, improving cooling efficiency\n\n**Impact:** Containment eliminates bypass airflow and recirculation, enabling:\n- Supply air temperatures to be raised from 13C to 20-25C\n- PUE improvement of 0.1-0.3\n- ASHRAE recommended supply temperatures (18-27C) to be safely used',
    tags: ['cooling', 'containment', 'hot-aisle', 'cold-aisle']
  },
  {
    front: 'What is in-row cooling, and when is it preferred over perimeter cooling?',
    back: '**Perimeter cooling:** CRAC/CRAH units placed around the room perimeter, delivering cold air under a raised floor plenum to the cold aisles.\n\n**In-row cooling:** Cooling units placed directly between racks within the row, drawing hot air from the hot aisle and discharging cold air into the cold aisle.\n\n**Advantages of in-row:**\n- Shorter air path (inches vs. metres) -- less fan energy, less mixing\n- Eliminates raised floor airflow management challenges (cable obstructions, uneven pressure)\n- Enables higher power densities (20-40kW/rack)\n- Better temperature uniformity across the rack face\n- Scalable: add cooling units as racks are deployed\n\n**When preferred:**\n- High-density deployments (>15kW/rack)\n- Facilities without raised floors\n- Retrofit of existing spaces\n- Targeted cooling for hot spots\n\n**Examples:** Schneider ACSC/ACRP, Vertiv Liebert CRV, Stulz CyberRow\n\n**Limitation:** Floor space consumed by cooling units reduces available rack positions. Chilled water piping must be routed to each row.',
    tags: ['cooling', 'in-row', 'high-density']
  },
  {
    front: 'What are rear-door heat exchangers (RDHx), and how do they work?',
    back: '**Rear-door heat exchangers** replace the standard rear door of a rack with a door containing a water or refrigerant coil that removes heat directly from the server exhaust air.\n\n**Types:**\n- **Passive RDHx:** Chilled water flows through the coil; no fans. Relies on server fans pushing air through the heat exchanger. Removes 60-80% of rack heat.\n- **Active RDHx:** Includes fans to draw air through the coil. Can remove 100%+ of rack heat (air exits cooler than room ambient).\n\n**Advantages:**\n- Neutralises rack heat at source -- minimal heat enters the room\n- No hot aisle containment needed\n- Can support 30-60kW/rack with active units\n- Room cooling only handles ambient and incidental loads\n- Retrofit-friendly: works with existing room infrastructure\n\n**Considerations:**\n- Chilled water piping to every rack (leak risk)\n- Condensation management (insulated pipes, dew point monitoring)\n- Increased rack depth\n- Maintenance access may be limited\n\n**2025 use case:** Popular for AI/GPU retrofits where existing room cooling cannot handle increased rack densities.',
    tags: ['cooling', 'RDHx', 'high-density', 'liquid-cooling']
  },
  {
    front: 'What is free cooling (economisation), and what are the main approaches?',
    back: '**Free cooling** uses low outside air temperatures to cool the data centre without running compressors, dramatically reducing cooling energy.\n\n**Airside economisation:**\n- Draws cool outside air directly into the data hall (filtered)\n- Hot exhaust air is expelled outside\n- Requires air handling units with dampers, filters, and humidity control\n- Best in cool, dry climates\n- Risk: outdoor contaminants (particulates, gaseous pollutants)\n\n**Waterside economisation:**\n- Uses cooling towers or dry coolers to produce cold water when ambient temperatures are low\n- Chilled water bypasses the chiller via a heat exchanger (plate or shell-and-tube)\n- No outside air enters the data hall\n- Preferred for most data centres (cleaner, more controllable)\n\n**Indirect airside:**\n- Outside air cools data hall air via an air-to-air heat exchanger (no mixing)\n- Best of both worlds: free cooling without contamination risk\n- Examples: EcoBreeze (Schneider), Kyoto wheel (rotating heat exchanger)\n\n**Hours of free cooling per year:**\n- Northern Europe (e.g., Dublin, Stockholm): 6,000-8,000+ hours\n- Southern US: 1,000-3,000 hours\n- With ASHRAE A1 recommended envelope (up to 27C), free cooling hours increase dramatically',
    tags: ['cooling', 'free-cooling', 'economisation', 'efficiency']
  },
  {
    front: 'What are the main liquid cooling technologies used in 2025 data centres?',
    back: '**1. Direct-to-Chip (Cold Plate) Cooling:**\n- Cold plates with circulating coolant attached directly to CPUs/GPUs\n- Removes heat at the source with 1000x better thermal conductivity than air\n- Server fans still needed for memory, VRMs, storage\n- Warm water (35-45C) enables free cooling year-round\n- **Most widely deployed liquid cooling for AI/HPC in 2025**\n- Used by: NVIDIA GB200 NVL72, most OEM AI servers\n\n**2. Single-Phase Immersion Cooling:**\n- Servers submerged in a dielectric fluid (e.g., engineered mineral oil, synthetic fluids)\n- Fluid circulates via pumps through external heat exchangers\n- No fans, no cold plates -- entire server cooled\n- Supports 100-200kW+ per tank\n- Maintenance: different procedures (extract servers from fluid)\n\n**3. Two-Phase Immersion Cooling:**\n- Servers submerged in low-boiling-point dielectric fluid (e.g., 3M Novec, now Solstice)\n- Fluid boils at chip surface (~49C), vapour rises to condenser coil, condenses, drips back\n- Extremely efficient -- phase change absorbs massive heat\n- Highest density: 250kW+ per tank\n- Challenges: fluid cost, containment, long-term material compatibility\n\n**All liquid cooling benefits:** PUE approaching 1.02-1.05, enables waste heat reuse, dramatically reduces water consumption vs. cooling towers.',
    tags: ['cooling', 'liquid-cooling', 'immersion', 'direct-to-chip']
  },
  {
    front: 'What is the psychrometric chart, and how is it used in data centre design?',
    back: '**The psychrometric chart** is a graphical representation of the thermodynamic properties of moist air at a constant pressure.\n\n**Key properties shown:**\n- **Dry-bulb temperature (x-axis):** Air temperature measured by a standard thermometer\n- **Wet-bulb temperature:** Temperature measured with a wetted wick -- indicates evaporative cooling potential\n- **Dew point:** Temperature at which moisture begins to condense\n- **Relative humidity (RH):** Curved lines showing % saturation\n- **Humidity ratio:** Mass of water vapour per mass of dry air (y-axis)\n- **Enthalpy:** Total heat content of the air\n\n**Data centre applications:**\n- Determining free cooling availability (is outside air within ASHRAE envelope?)\n- Sizing humidification/dehumidification equipment\n- Calculating cooling coil load (sensible + latent)\n- Evaluating evaporative cooling potential (wet-bulb depression)\n- Assessing condensation risk on cold surfaces\n\n**Practical use:** Plot the ASHRAE recommended envelope on the psychrometric chart, overlay local climate data, and calculate annual hours of free cooling availability.',
    tags: ['cooling', 'psychrometrics', 'ASHRAE', 'design']
  },
  {
    front: 'What is Computational Fluid Dynamics (CFD) and how is it used in data centre cooling design?',
    back: '**CFD** is numerical simulation of airflow, temperature, and pressure distribution within a data centre space.\n\n**What it models:**\n- Air velocity and direction throughout the room\n- Temperature distribution (identifying hot spots)\n- Pressure differentials (raised floor plenum, containment)\n- Effect of obstructions (cables, structural elements)\n\n**Applications in data centre design:**\n- **Pre-build:** Validate cooling design, rack layout, containment strategy before construction\n- **Capacity planning:** Determine if existing cooling can handle new high-density racks\n- **Troubleshooting:** Diagnose hot spots and airflow short-circuits\n- **What-if analysis:** Test effect of adding/removing racks or cooling units\n\n**Key outputs:**\n- Temperature contour maps (plan and section views)\n- Airflow velocity vectors\n- Supply/return temperature differential (delta-T)\n- Rack Cooling Index (RCI) and Return Temperature Index (RTI)\n\n**Limitations:**\n- Model accuracy depends on input data quality\n- Computationally intensive for large facilities\n- Must be re-run as layout changes\n\n**Tools:** 6SigmaRoom (Future Facilities), Cadence Reality DC, TileFlow.',
    tags: ['cooling', 'CFD', 'design', 'simulation']
  }
];

// ---------- UNIT 5: Heat Rejection ----------
const unit5 = [
  {
    front: 'What are the main types of chillers used in data centres?',
    back: '**1. Air-Cooled Chillers:**\n- Condenser cooled by ambient air via fans\n- No water consumption or cooling tower\n- Lower maintenance; simpler to install\n- Less efficient in hot climates (COP 2.5-3.5)\n- Suitable for smaller facilities or water-scarce locations\n\n**2. Water-Cooled Chillers:**\n- Condenser cooled by water from a cooling tower\n- Higher efficiency (COP 5.0-7.0+) because wet-bulb temperature is lower than dry-bulb\n- Requires cooling tower, condenser water pumps, water treatment\n- Significant water consumption (evaporation)\n- Standard for large data centres\n\n**3. Evaporatively-Cooled Chillers:**\n- Integrated evaporative condenser (spray water over condenser coils)\n- Better efficiency than air-cooled, simpler than water-cooled\n- Moderate water consumption\n\n**Chiller types by compressor:**\n- **Centrifugal:** Large capacity (500-2000+ RT), highest efficiency, oil-free magnetic bearing designs available\n- **Screw:** Medium capacity (100-500 RT), robust, good part-load efficiency\n- **Scroll:** Smaller capacity (20-100 RT), modular, edge/smaller DCs\n\n**2025 trend:** Variable-speed centrifugal chillers with magnetic bearings and low-GWP refrigerants (R-1234ze, R-515B) replacing R-134a and R-410A.',
    tags: ['heat-rejection', 'chillers', 'equipment']
  },
  {
    front: 'How do cooling towers work, and what are the types used in data centres?',
    back: '**Principle:** Cooling towers reject heat by evaporating a small portion of the condenser water. The latent heat of evaporation cools the remaining water.\n\n**Types:**\n\n**Open (direct contact):**\n- Water sprayed over fill media; air flows through and contacts water directly\n- Most efficient (approaches wet-bulb temperature)\n- Water loss: ~1.5% per 5.5C of cooling (evaporation + drift + blowdown)\n- Risk: Legionella (requires water treatment programme)\n\n**Closed-circuit (indirect):**\n- Process water flows through a closed coil; spray water evaporates over the coil exterior\n- Process water never contacts air -- cleaner, lower Legionella risk\n- Slightly less efficient than open towers\n\n**Dry coolers (no water):**\n- Fluid-to-air heat exchanger (like a car radiator)\n- No water consumption, no Legionella risk\n- Limited by dry-bulb temperature (less effective in hot climates)\n- Used where water scarcity or regulations prohibit evaporative cooling\n\n**Airflow arrangement:**\n- **Counterflow:** Air moves up, water falls down (most compact, highest efficiency)\n- **Crossflow:** Air moves horizontally through falling water (easier maintenance)\n\n**2025 concern:** Water Usage Effectiveness (WUE) is now a tracked sustainability metric. Many operators are shifting to dry coolers or adiabatic-assist systems to reduce water consumption.',
    tags: ['heat-rejection', 'cooling-towers', 'water']
  },
  {
    front: 'What is the difference between dry-bulb and wet-bulb temperature, and why does it matter for data centre cooling?',
    back: '**Dry-bulb temperature:** Standard air temperature measured by a thermometer shielded from radiation and moisture.\n\n**Wet-bulb temperature:** Temperature measured by a thermometer wrapped in a wet cloth with air flowing over it. It reflects the cooling effect of evaporation and is always equal to or lower than dry-bulb.\n\n**The difference (wet-bulb depression):**\n- Hot, dry air: large difference (great evaporative cooling potential)\n- Hot, humid air: small difference (limited evaporative cooling)\n- Saturated air (100% RH): wet-bulb = dry-bulb (no evaporative cooling)\n\n**Why it matters:**\n- **Air-cooled systems** (dry coolers, air-cooled chillers) are limited by dry-bulb temperature\n- **Evaporative systems** (cooling towers, evaporative coolers) can cool to within 2-3C of wet-bulb temperature -- often 10-20C lower than dry-bulb\n- This is why water-cooled chillers are more efficient: their condenser water from cooling towers is much colder than ambient air\n\n**Design impact:**\n- Site selection considers wet-bulb design temperature (ASHRAE 0.4% or 1% design conditions)\n- London wet-bulb design: ~20C vs. dry-bulb ~32C = 12C advantage for evaporative cooling\n- Phoenix wet-bulb design: ~24C vs. dry-bulb ~43C = 19C advantage',
    tags: ['heat-rejection', 'wet-bulb', 'dry-bulb', 'psychrometrics']
  },
  {
    front: 'What are adiabatic cooling systems, and how are they used in data centres?',
    back: '**Adiabatic cooling** pre-cools air by evaporating water into the airstream before it enters a heat exchanger, combining the benefits of dry cooling and evaporative cooling.\n\n**How it works:**\n1. In cool conditions: operates as a dry cooler (no water used)\n2. When ambient temperature rises above a setpoint, water is sprayed onto pads or into the air upstream of the heat exchanger\n3. Evaporation lowers the air temperature entering the coil\n4. Only uses water during hot periods (typically 500-2000 hours/year in temperate climates)\n\n**Advantages:**\n- 80-90% less water consumption than full evaporative cooling towers\n- Better efficiency than pure dry cooling in hot weather\n- No Legionella risk (water evaporates completely; no recirculation)\n- Lower maintenance than cooling towers\n\n**Applications:**\n- Pre-cooling air for dry coolers or air-cooled chillers\n- Indirect evaporative cooling units (data hall air never contacts water)\n- Adiabatic assist for condenser air on chillers\n\n**Examples:** Excool (indirect adiabatic), EcoCooling, Munters\n\n**2025 position:** Adiabatic systems are the preferred compromise between efficiency and water conservation for many new builds.',
    tags: ['heat-rejection', 'adiabatic', 'water-efficiency']
  },
  {
    front: 'What is waste heat reuse in data centres, and what are the practical approaches?',
    back: '**Concept:** Data centres are essentially large electric heaters. Instead of rejecting heat to the atmosphere, capture and use it productively.\n\n**The challenge:** Most data centre reject heat is low-grade (30-40C air or water), which limits its usefulness for conventional heating systems designed for 60-80C water.\n\n**Approaches:**\n\n**1. District heating:**\n- Feed warm water into district heating networks\n- Requires heat pumps to boost temperature to 60-80C\n- Successful examples: Stockholm, Helsinki, Amsterdam, Paris\n\n**2. On-site building heating:**\n- Heat adjacent offices, warehouses, or the data centre\'s own admin areas\n\n**3. Agriculture:**\n- Greenhouse heating, aquaculture\n\n**4. Liquid cooling advantage:**\n- Direct-to-chip cooling captures heat at 50-60C (higher grade)\n- Immersion cooling can deliver 50-70C coolant\n- Much more useful for heat reuse than 30C air\n\n**2025 drivers:**\n- EU Energy Efficiency Directive (2023/1791) requires new DCs >1MW to assess waste heat reuse feasibility\n- Carbon reporting (Scope 1/2) credits for heat reuse\n- Economic incentive in regions with high heating costs\n\n**COP of heat pump:** Using a heat pump with COP 3-4, every 1kW of electricity produces 3-4kW of useful heat.',
    tags: ['heat-rejection', 'waste-heat', 'sustainability', 'district-heating']
  },
  {
    front: 'What is Coefficient of Performance (COP) and how does it apply to data centre cooling?',
    back: '**COP** = useful cooling (or heating) output divided by energy input.\n\n**For cooling:** COP = cooling capacity (kW) / electrical input (kW)\n\n**Example:** A chiller with COP 5.0 produces 5kW of cooling for every 1kW of electricity consumed.\n\n**Typical COP values:**\n- Air-cooled chiller: 2.5-3.5\n- Water-cooled centrifugal chiller: 5.0-7.0\n- Variable-speed centrifugal at part load: 8.0-12.0+\n- Free cooling (dry cooler): 15-30 (only pump/fan energy)\n- Heat pump (heating mode): 3.0-5.0\n\n**Related metrics:**\n- **EER (Energy Efficiency Ratio):** Same as COP but in BTU/h per watt (EER = COP x 3.412)\n- **IPLV (Integrated Part Load Value):** Weighted average efficiency at 25%, 50%, 75%, 100% load. More representative of real-world operation where chillers rarely run at full load.\n- **kW/ton:** Inverse of COP in imperial units (lower is better). 1 ton = 3.517 kW.\n\n**Design impact:** Selecting a chiller with COP 6.0 vs 4.0 reduces cooling energy by 33% -- directly improving PUE.',
    tags: ['heat-rejection', 'COP', 'efficiency', 'chillers']
  },
  {
    front: 'What refrigerants are used in data centre cooling, and what are the 2025 regulatory changes?',
    back: '**Traditional refrigerants (being phased out):**\n- **R-134a:** GWP 1,430. Widely used in centrifugal chillers. Being phased down.\n- **R-410A:** GWP 2,088. Common in DX systems and smaller chillers. Phase-down accelerating.\n- **R-407C:** GWP 1,774. Used in older CRAC units.\n\n**Low-GWP replacements (2025 standard for new equipment):**\n- **R-1234ze(E):** GWP 7. Drop-in replacement for R-134a in centrifugal chillers. Mildly flammable (A2L).\n- **R-515B:** GWP 293. Blend, non-flammable. Replacement for R-134a.\n- **R-32:** GWP 675. Replacement for R-410A. Mildly flammable (A2L).\n- **R-454B:** GWP 466. Replacement for R-410A. Mildly flammable (A2L).\n- **R-290 (propane):** GWP 3. Natural refrigerant. Highly flammable (A3). Used in small, sealed systems.\n\n**Regulatory drivers:**\n- **EU F-Gas Regulation (2024 revision):** Aggressive HFC phase-down. Bans HFCs with GWP >150 in new chillers from 2027.\n- **Kigali Amendment (Montreal Protocol):** Global HFC phase-down, 80% reduction by 2047.\n- **US AIM Act:** Aligns with Kigali targets.\n\n**Impact on design:** Specify low-GWP refrigerants in all new cooling equipment. Existing systems with high-GWP refrigerants face increasing service costs and eventual unavailability.',
    tags: ['heat-rejection', 'refrigerants', 'regulations', 'F-gas']
  },
  {
    front: 'What is delta-T in cooling system design, and why is a higher delta-T desirable?',
    back: '**Delta-T** is the temperature difference between the supply and return water (or air) in a cooling system.\n\n**Chilled water example:**\n- Traditional: supply 7C, return 12C, delta-T = 5C\n- Optimised: supply 12C, return 22C, delta-T = 10C\n\n**Why higher delta-T is better:**\n\n**1. Reduced water flow rate:**\n- Q (kW) = m-dot x Cp x delta-T\n- For the same cooling load, doubling delta-T halves the flow rate\n- Smaller pipes, smaller pumps, less pumping energy\n\n**2. Improved chiller efficiency:**\n- Higher return water temperature improves chiller COP\n- Warmer supply water enables more free cooling hours\n\n**3. Lower capital cost:**\n- Smaller pipes, valves, pumps throughout the facility\n\n**Air-side delta-T:**\n- Traditional: supply 13C, return 30C, delta-T = 17C\n- Contained: supply 22C, return 38C, delta-T = 16C\n- Higher supply temperature = more free cooling hours\n- Higher return temperature = better heat rejection efficiency\n\n**ASHRAE recommendation:** Supply air 18-27C (recommended) enables delta-T designs that were impossible at older 13C supply temperatures.',
    tags: ['heat-rejection', 'delta-T', 'efficiency', 'design']
  }
];

// ---------- UNIT 6: Environmental Parameters ----------
const unit6 = [
  {
    front: 'What are the ASHRAE thermal guidelines for data centre environments (2025)?',
    back: '**ASHRAE TC 9.9 Thermal Guidelines (5th Edition, updated):**\n\n**Recommended Envelope (target for new designs):**\n- Temperature: 18-27C (64.4-80.6F) dry-bulb at server inlet\n- Humidity: -9C dew point to 60% RH and 15C dew point\n- No lower RH limit (removed in 4th edition)\n\n**Allowable Envelopes (equipment will operate but with reduced reliability):**\n\n| Class | Temp Range | Max DP | Max RH |\n|-------|-----------|--------|--------|\n| A1 | 15-32C | 17C | 80% |\n| A2 | 10-35C | 21C | 80% |\n| A3 | 5-40C | 24C | 85% |\n| A4 | 5-45C | 24C | 90% |\n\n**Key changes from earlier editions:**\n- Recommended range widened (was 20-25C)\n- Lower humidity limit removed (no minimum RH)\n- A3/A4 classes enable free cooling in extreme climates\n\n**Design impact:** Operating at 27C supply instead of 20C dramatically increases free cooling hours and reduces compressor runtime. Most server manufacturers now warrant equipment to A2 or wider.',
    tags: ['environment', 'ASHRAE', 'temperature', 'humidity']
  },
  {
    front: 'Why was the lower humidity limit removed from ASHRAE data centre guidelines?',
    back: '**Historical concern:** Low humidity causes electrostatic discharge (ESD) that could damage IT equipment. The original guideline required minimum 40% RH, later reduced to 20% RH.\n\n**Why it was removed (ASHRAE 4th Edition onwards):**\n\n**1. Modern IT equipment is more resilient:**\n- Components are smaller, lower voltage, and inherently more ESD-resistant\n- Automated manufacturing with better ESD controls\n\n**2. ESD risk is managed by other means:**\n- Grounded raised floors and racks\n- Anti-static flooring materials\n- Proper grounding and bonding practices\n- ESD-safe maintenance procedures\n\n**3. Humidification is expensive:**\n- Steam humidifiers consume 1-3% of total facility energy\n- Ultrasonic/adiabatic humidifiers risk introducing contaminants\n- Water consumption and treatment costs\n\n**4. Research showed:**\n- ASHRAE-sponsored studies found no correlation between low RH and IT equipment failure rates in properly managed environments\n\n**2025 practice:** Most operators no longer actively humidify. If dew point stays above -9C (the recommended lower bound), no action is needed. Significant energy and water savings result from eliminating humidification.',
    tags: ['environment', 'humidity', 'ASHRAE', 'ESD']
  },
  {
    front: 'What types of particulate and gaseous contamination affect data centres?',
    back: '**Particulate contamination:**\n- Dust, fibres, metal particles, pollen\n- Effects: clogged filters, reduced airflow, heat buildup, short circuits on PCBs\n- Standard: ISO 14644-1 Class 8 (equivalent to ~3.5 million particles >= 0.5um per m3)\n- Control: MERV 11-13 filters (minimum), MERV 14+ recommended. HEPA for critical areas.\n\n**Gaseous contamination:**\n- **Sulphur compounds (H2S, SO2):** Corrode copper and silver traces on PCBs\n- **Chlorine compounds:** Attack metals, especially in coastal or industrial areas\n- **NOx:** From diesel generators or nearby traffic\n\n**ASHRAE severity levels:**\n- **G1 (mild):** Copper corrosion < 300 angstroms/month, silver < 200\n- **GX (severe):** Above these limits -- requires gas-phase filtration\n\n**Control measures:**\n- Activated carbon filters for gaseous contaminants\n- Positive pressurisation to prevent unfiltered air ingress\n- Sealed cable penetrations and wall openings\n- Locate air intakes away from generator exhausts and loading docks\n\n**2025 concern:** Airside economiser designs must carefully manage contamination. Many operators in polluted areas choose indirect economisers or waterside free cooling to avoid introducing outside air.',
    tags: ['environment', 'contamination', 'filtration', 'ASHRAE']
  },
  {
    front: 'How does altitude affect data centre cooling design?',
    back: '**The physics:** Air density decreases with altitude. Less dense air carries less heat per unit volume.\n\n**Effects on cooling:**\n- **Reduced air cooling capacity:** At 1,500m elevation, air density is ~15% lower than sea level. Equipment designed for sea level delivers 15% less cooling.\n- **Fan performance:** Fans move the same volume but less mass of air -- reduced heat transfer\n- **Must increase airflow volume** to compensate (larger fans, more energy)\n\n**Effects on power:**\n- **Generator derating:** Diesel engines lose ~3-4% power per 300m above 1,000m (less oxygen for combustion)\n- **Transformer derating:** Reduced air cooling capability\n- **UPS derating:** Some manufacturers derate above 1,000m\n\n**Effects on evaporative cooling:**\n- Lower boiling point of water at altitude -- slightly beneficial for evaporative cooling\n- But lower air density partially offsets this advantage\n\n**Design compensation:**\n- Derate all air-cooled equipment per manufacturer altitude correction curves\n- Oversize fans and heat exchangers by the density ratio factor\n- Consider liquid cooling (not affected by altitude) for high-altitude sites\n\n**Notable examples:** Data centres in Mexico City (~2,240m), Denver (~1,600m), Johannesburg (~1,750m) all require altitude derating.',
    tags: ['environment', 'altitude', 'derating', 'design']
  },
  {
    front: 'What is the difference between dew point and relative humidity, and which is better for data centre control?',
    back: '**Relative Humidity (RH):**\n- Percentage of moisture in air relative to the maximum it can hold at that temperature\n- **Changes with temperature:** the same air at 50% RH at 20C becomes ~30% RH at 30C (even though moisture content is identical)\n- Misleading for data centre control because supply and return air are at different temperatures\n\n**Dew Point:**\n- The temperature at which air becomes saturated and condensation begins\n- **Independent of air temperature** -- represents absolute moisture content\n- Same dew point regardless of whether you measure in the cold aisle or hot aisle\n\n**Why dew point is better for data centres:**\n1. A data centre has multiple temperature zones (cold aisle 22C, hot aisle 38C, outside 10C). RH varies wildly across these zones for the same air. Dew point is consistent.\n2. Condensation risk is directly related to dew point, not RH.\n3. ASHRAE now uses dew point as the primary humidity metric.\n\n**ASHRAE recommended:** -9C to 15C dew point\n\n**Control strategy:** Monitor dew point at a representative location. Only humidify if dew point drops below -9C (very rare in most climates). Only dehumidify if dew point exceeds 15C (only relevant when using outdoor air).',
    tags: ['environment', 'humidity', 'dew-point', 'ASHRAE']
  },
  {
    front: 'What is the ASHRAE Thermal Guidelines "recommended" vs "allowable" distinction, and how does it affect design decisions?',
    back: '**Recommended envelope:**\n- The range where ASHRAE recommends operating for optimal reliability and energy efficiency\n- 18-27C, -9C to 15C DP / 60% RH\n- Equipment manufacturers warrant full reliability within this range\n- Design target for new builds\n\n**Allowable envelopes (A1-A4):**\n- The range where equipment will function but with potentially reduced reliability or lifespan\n- A1 (15-32C) through A4 (5-45C)\n- Equipment rated for the class will operate but failure rates may increase at extremes\n- Used for transient conditions, not steady-state design\n\n**Design implications:**\n\n| Strategy | Recommended Only | Allowable A2/A3 |\n|----------|-----------------|------------------|\n| Free cooling hours | Moderate | Significantly more |\n| Equipment reliability | Highest | Slightly reduced |\n| Infrastructure cost | Higher (more cooling) | Lower |\n| Energy cost | Higher | Lower |\n| PUE | Higher | Lower |\n\n**2025 practice:**\n- Design cooling systems to maintain recommended envelope under normal conditions\n- Allow brief excursions into A1/A2 during extreme weather or cooling system maintenance\n- Many hyperscalers operate closer to A2 limits permanently, accepting marginal reliability trade-off for significant energy savings\n- IT hardware refresh cycles (3-5 years) make long-term reliability at elevated temperatures less of a concern',
    tags: ['environment', 'ASHRAE', 'design', 'reliability']
  },
  {
    front: 'What environmental monitoring should be deployed in a data centre?',
    back: '**Temperature monitoring:**\n- At server inlet (cold aisle), every 3rd rack minimum\n- At server exhaust (hot aisle)\n- At CRAC/CRAH supply and return\n- Under raised floor (if applicable)\n- At cooling unit inlet and outside ambient\n- **Resolution:** alert at 27C (ASHRAE recommended limit), alarm at 32C (A1 allowable)\n\n**Humidity monitoring:**\n- Dew point sensors at representative locations (minimum 2-3 per room)\n- Not needed at every rack (dew point is uniform in a well-mixed environment)\n\n**Differential pressure:**\n- Across raised floor (typically 12.5-25 Pa positive in cold aisle)\n- Room vs corridor (positive pressure to prevent infiltration)\n- Across air filters (indicates when to replace)\n\n**Water leak detection:**\n- Cable-style leak sensors under raised floor along chilled water pipe routes\n- Spot sensors under CRAH drip trays, near humidifiers\n\n**Power monitoring:**\n- Per-circuit at PDU/RPP (branch circuit monitoring)\n- Per-rack at intelligent PDU\n- UPS input/output, generator status\n\n**Integration:** All sensors report to DCIM/BMS via SNMP, Modbus, or BACnet. Automated alerting via email/SMS/webhook.\n\n**2025 addition:** AI/ML-based predictive analytics identifying anomalies before they become incidents.',
    tags: ['environment', 'monitoring', 'DCIM', 'sensors']
  },
  {
    front: 'What fire detection and suppression systems are used in data centres?',
    back: '**Detection:**\n- **VESDA (Very Early Smoke Detection Apparatus):** Aspirating smoke detection that continuously samples air through a pipe network. Detects smoke particles at very low concentrations (pre-fire stage). Standard for data centres.\n- **Spot detectors:** Point-type photoelectric or ionisation detectors as backup.\n- **Multi-zone:** Separate detection zones per room/hall for targeted response.\n\n**Suppression:**\n\n**1. Clean agent gas suppression:**\n- **FM-200 (HFC-227ea):** Most widely installed, being phased down (GWP 3220)\n- **Novec 1230 (FK-5-1-12):** GWP 1, ODP 0, 5-day atmospheric lifetime. Preferred replacement.\n- **Inergen (IG-541):** Blend of N2, Ar, CO2. Zero GWP. Requires more storage cylinders (larger volume).\n- All are electrically non-conductive, leave no residue, safe for IT equipment.\n\n**2. Water mist:**\n- Fine water droplets (< 200 microns) that cool and smother fire\n- Less water damage than traditional sprinklers\n- Growing adoption, especially in larger facilities\n\n**3. Pre-action sprinkler:**\n- Pipes are dry until smoke detection confirms fire, then charged with water\n- Double-interlock: requires both smoke detection and heat activation\n- Required by insurance/code as backup in many jurisdictions\n\n**Design consideration:** Gas suppression requires room integrity testing (door fan test) to ensure gas concentration is maintained for the required hold time (typically 10 minutes).',
    tags: ['environment', 'fire-suppression', 'detection', 'safety']
  }
];

// ---------- UNIT 7: IT Infrastructure & Environment ----------
const unit7 = [
  {
    front: 'How has rack power density evolved, and what are 2025 typical ranges?',
    back: '**Historical evolution:**\n- 2000s: 2-4 kW/rack (enterprise servers)\n- 2010s: 5-10 kW/rack (virtualised workloads)\n- 2015-2020: 10-20 kW/rack (high-density compute)\n- 2020-2023: 20-40 kW/rack (GPU-accelerated, early AI)\n- 2025: 40-100+ kW/rack (AI/ML training, GPU clusters)\n\n**Benchmark examples (2025):**\n- Standard enterprise: 8-12 kW/rack\n- Colocation average: 6-10 kW/rack\n- NVIDIA DGX H100: ~10kW per node, 8 nodes/rack = ~80kW/rack\n- NVIDIA GB200 NVL72: ~120kW per rack (liquid-cooled)\n- TPU v5 pods: 60-80kW/rack\n\n**Design impact:**\n- Air cooling practical limit: ~25-30 kW/rack (with containment + in-row)\n- Above 30kW: liquid cooling required (direct-to-chip or immersion)\n- Power distribution must be redesigned (busway, larger whips, higher voltage to rack)\n- Structural: high-density racks can exceed 1,000 kg -- floor loading must be verified\n\n**Mixed density challenge:** Most facilities have a range of densities. Design for flexibility with modular cooling that can be deployed where needed.',
    tags: ['IT-infrastructure', 'power-density', 'AI', 'GPU']
  },
  {
    front: 'What are the key considerations for structured cabling in a data centre?',
    back: '**Cabling standards:**\n- TIA-568 (North America), ISO/IEC 11801 (international), EN 50173 (Europe)\n- TIA-942 defines data centre-specific cabling topology\n\n**Copper cabling:**\n- Cat 6A: supports 10GbE up to 100m. Standard for horizontal runs.\n- Cat 8: supports 25/40GbE up to 30m. For short runs within rows.\n- Shielded (F/UTP or S/FTP) preferred in data centres to reduce alien crosstalk.\n\n**Fibre optic:**\n- **OM3/OM4 multimode:** 10-100GbE up to 100-150m. Standard for intra-building.\n- **OM5 (wideband):** Supports shortwave WDM for 100-400G applications.\n- **OS2 single-mode:** For runs >500m, inter-building, and high-bandwidth backbones.\n- **MPO/MTP connectors:** Multi-fibre push-on for high-density 40/100/400G connections.\n\n**2025 trends:**\n- 400GbE and 800GbE deployment for AI cluster interconnects\n- Direct Attach Copper (DAC) and Active Optical Cables (AOC) for short intra-rack connections\n- Fibre-to-the-server for AI/GPU clusters (replacing copper)\n- Pre-terminated trunk cables for rapid deployment\n\n**Best practices:**\n- Separate hot and cold aisle cable routing\n- Maintain minimum bend radius\n- Label everything; maintain as-built documentation\n- Cable management to avoid airflow obstruction (especially in raised floor plenums)',
    tags: ['IT-infrastructure', 'cabling', 'fibre', 'copper']
  },
  {
    front: 'What are the advantages and disadvantages of raised floor vs overhead distribution?',
    back: '**Raised Floor:**\n- Traditional approach: cold air distributed under floor to perforated tiles in cold aisles\n- Also routes power and data cables below floor\n- **Advantages:** Familiar, flexible tile placement, established best practices\n- **Disadvantages:**\n  - Cable congestion restricts airflow (can block 30-50% of plenum)\n  - Uneven pressure distribution causes hot spots\n  - Height adds to building cost\n  - Structural limits on floor loading (for heavy racks)\n  - Difficult to reconfigure at scale\n  - Leak detection more complex\n\n**Overhead Distribution:**\n- Cold air delivered from ceiling or overhead ducts; cables routed in overhead trays/baskets\n- Power via overhead busway with tap-off boxes\n- **Advantages:**\n  - No airflow obstruction from cables\n  - Better air delivery control\n  - Easier visual inspection and maintenance\n  - No floor height requirements\n  - Better structural support for heavy racks (slab-on-grade)\n  - Simpler leak detection\n- **Disadvantages:**\n  - Higher ceiling required\n  - Overhead cable trays need structural support\n  - Less familiar to some operators\n\n**2025 trend:** New builds strongly favour overhead distribution or slab-level delivery. Raised floors are increasingly seen as legacy. High-density AI deployments almost exclusively use overhead or direct-piped liquid cooling.',
    tags: ['IT-infrastructure', 'raised-floor', 'overhead', 'design']
  },
  {
    front: 'What is DCIM (Data Centre Infrastructure Management), and what does it monitor?',
    back: '**DCIM** is software that integrates IT and facility management to provide a unified view of data centre operations.\n\n**Core capabilities:**\n\n**1. Asset management:**\n- Track all physical assets (servers, switches, PDUs, cooling units)\n- Rack elevation views, floor plans\n- Lifecycle management (warranty, refresh dates)\n\n**2. Capacity management:**\n- Power: available vs provisioned vs actual at rack, row, room, building level\n- Cooling: available capacity vs demand\n- Space: available rack units and floor space\n- Network: port utilisation\n\n**3. Real-time monitoring:**\n- Power (kW, kVA, PF, current per circuit)\n- Environmental (temperature, humidity, dew point)\n- Cooling system status and performance\n- UPS and generator status\n\n**4. Analytics and reporting:**\n- PUE, WUE, CUE trending\n- Capacity forecasting\n- Energy cost allocation\n- Carbon reporting\n\n**5. Workflow and change management:**\n- Work order tracking\n- Planned vs actual configurations\n\n**2025 enhancements:**\n- AI/ML for predictive analytics (failure prediction, cooling optimisation)\n- Digital twin integration (3D model synced to live data)\n- API-first architecture for integration with ITSM, BMS, cloud management\n\n**Leading vendors:** Schneider (EcoStruxure IT), Vertiv (Trellis), Nlyte, Sunbird, Device42.',
    tags: ['IT-infrastructure', 'DCIM', 'monitoring', 'management']
  },
  {
    front: 'What are the standard rack sizes and specifications used in data centres?',
    back: '**Standard rack dimensions (19-inch):**\n- Width: 600mm (19" equipment mounting width inside)\n- Depth: 1000mm or 1200mm (1200mm increasingly standard for deep servers)\n- Height: 42U or 47U (1U = 44.45mm = 1.75 inches)\n\n**Rack specifications:**\n- **Weight capacity:** 1,000-1,500 kg static, verify floor loading\n- **Power:** Typically 2x vertical-mount PDUs (A+B feeds)\n- **Cable management:** Vertical cable managers on sides, horizontal at patch panels\n- **Airflow:** Perforated front door (>64% open area), solid or perforated rear door\n- **Blanking panels:** Cover unused U-spaces to prevent hot air recirculation\n\n**Rack spacing:**\n- Cold aisle width: 1,200mm (minimum), 1,500mm preferred for maintenance\n- Hot aisle width: 900-1,200mm (can be narrower since less human access)\n- Row spacing (front-to-front): 2,400-3,000mm including cold aisle\n\n**2025 considerations:**\n- AI/GPU racks may need 1,200mm+ depth and reinforced frames\n- Liquid cooling connections (quick-disconnect manifolds) at rack level\n- Open-frame racks (no doors) common in hyperscale for maximum airflow\n- OCP (Open Compute Project) racks: 21" wide, designed for efficiency and standardisation\n\n**Standards:** IEC 60297, EIA-310-E',
    tags: ['IT-infrastructure', 'racks', 'standards', 'specifications']
  },
  {
    front: 'What physical security measures are required for a data centre?',
    back: '**Perimeter security:**\n- Fencing: 2.4m+ anti-climb with detection (sensors, CCTV)\n- Vehicle barriers: bollards, crash-rated gates at entry points\n- CCTV: Full perimeter coverage, 30+ day retention, analytics-capable\n- Lighting: uniform illumination of perimeter and parking\n\n**Building access:**\n- Mantrap / airlock at main entrance (two interlocked doors)\n- Multi-factor authentication: card + biometric (fingerprint, iris, facial recognition)\n- Visitor management: escorted access only, pre-registration\n- Loading dock: separate from main entrance, controlled access\n\n**Data hall access:**\n- Separate access control zone from building entry\n- Cabinet-level locking (electronic or mechanical) for colocation\n- CCTV inside data halls with rack-aisle views\n- No tailgating: turnstiles or mantrap\n\n**Environmental:**\n- No external signage identifying the building as a data centre\n- Blast-resistant construction for high-security facilities\n- Separation of mechanical/electrical areas from IT spaces\n\n**Monitoring:**\n- 24/7 security operations centre (SOC) or NOC with security feeds\n- Alarm integration with access control, CCTV, intrusion detection\n- Audit trails of all access events\n\n**Standards:** ISO 27001 (information security), SOC 2 Type II (service organisation controls), local building codes.',
    tags: ['IT-infrastructure', 'security', 'access-control', 'standards']
  },
  {
    front: 'What is the Open Compute Project (OCP), and how does it influence data centre design?',
    back: '**OCP** was founded by Facebook (Meta) in 2011 to share data centre and hardware designs as open-source, reducing costs and improving efficiency.\n\n**Key contributions:**\n\n**Hardware:**\n- Vanity-free servers (no bezels, paint, logos -- pure function)\n- 12V-only power distribution to servers (eliminating PSU voltage conversion)\n- Open rack standard (21" wide, integrated power shelf)\n- Open networking switches\n- Disaggregated storage\n\n**Facility design:**\n- Published designs for entire data centres\n- Emphasis on evaporative cooling and high ambient temperatures\n- Simplified electrical distribution\n- Standardised mechanical/electrical modules\n\n**2025 influence:**\n- Most hyperscalers (Meta, Microsoft, Google) contribute to and consume OCP designs\n- OCP designs for liquid cooling (cold plate manifold specifications)\n- AI hardware specifications (OAM -- OCP Accelerator Module)\n- Colocation providers offering OCP-ready environments\n- DC-BUS (48V DC power distribution to racks) gaining adoption\n\n**Impact on enterprise:**\n- Enterprise adoption growing through OCP-influenced products from Dell, HPE, Lenovo\n- Drives commoditisation of hardware and standardisation of facility design\n- Pushes the industry toward higher efficiency and lower cost',
    tags: ['IT-infrastructure', 'OCP', 'open-compute', 'standards']
  },
  {
    front: 'What is 48V DC power distribution, and why is it gaining adoption?',
    back: '**Concept:** Replace traditional AC distribution to servers with 48V DC power, eliminating multiple AC-DC-AC conversion stages.\n\n**Traditional AC path:**\nUtility AC -> UPS (AC-DC-AC) -> PDU transformer (480/400V to 208/230V) -> Server PSU (AC-DC 12V) -> VRMs (12V to CPU/GPU voltages)\nEach conversion loses 2-5% efficiency.\n\n**48V DC path:**\nUtility AC -> Rectifier (AC to 48V DC) -> 48V bus to rack -> Server (48V DC-DC to 12V) -> VRMs\nFewer conversion stages = higher overall efficiency.\n\n**Efficiency gain:** 1-3% improvement in power delivery efficiency. On a 10MW facility, this saves 100-300kW = $80-240K/year.\n\n**Advantages:**\n- Fewer components, higher reliability\n- Smaller, lighter cables for same power (48V vs 12V)\n- No harmonic issues (DC has no harmonics)\n- Simpler battery integration (Li-ion at 48V nominal)\n\n**Challenges:**\n- Non-standard; limited equipment ecosystem (growing fast)\n- Requires different skill sets for electricians\n- Arc flash risk different from AC (DC arcs harder to extinguish)\n- Protection devices (DC breakers, fuses) less mature than AC\n\n**2025 status:** Google pioneered 48V DC in 2016. Now adopted by multiple hyperscalers. OCP standardised the 48V rack power shelf. Enterprise adoption still limited but growing.\n\n**Standards:** ETSI EN 300 132-3 (48V DC for telecom/DC), OCP rack power specification.',
    tags: ['IT-infrastructure', 'power', '48V-DC', 'efficiency']
  }
];

// ---------- UNIT 8: Regulatory & Standards ----------
const unit8 = [
  {
    front: 'What are the Uptime Institute Tier classifications (I-IV)?',
    back: '**Tier I -- Basic Site Infrastructure:**\n- Single, non-redundant distribution path\n- No redundant capacity components\n- Expected availability: 99.671% (28.8 hours downtime/year)\n- No requirement for generator or UPS redundancy\n\n**Tier II -- Redundant Capacity Components:**\n- Single distribution path with redundant capacity components (N+1)\n- Expected availability: 99.741% (22 hours downtime/year)\n- Redundant UPS modules and generators, but single distribution path\n\n**Tier III -- Concurrently Maintainable:**\n- Multiple distribution paths (only one active), redundant components\n- Any component can be removed for maintenance without IT shutdown\n- Expected availability: 99.982% (1.6 hours downtime/year)\n- Dual utility feeds, N+1 throughout, dual-corded IT equipment\n\n**Tier IV -- Fault Tolerant:**\n- Multiple active distribution paths, redundant components\n- Single fault anywhere does not cause downtime\n- Expected availability: 99.995% (26 minutes downtime/year)\n- 2N power, 2N cooling, fully compartmentalised systems\n\n**Key distinction:** Tier III = no downtime for planned maintenance. Tier IV = no downtime for unplanned faults either.\n\n**Certification types:** Design Documents, Constructed Facility, Operational Sustainability (TCOS).',
    tags: ['standards', 'uptime-institute', 'tiers', 'availability']
  },
  {
    front: 'What is EN 50600, and how does it differ from Uptime Institute Tiers?',
    back: '**EN 50600** is a European standard series for data centre facilities and infrastructures, published by CENELEC.\n\n**Structure:**\n- EN 50600-1: General concepts\n- EN 50600-2-1: Building construction\n- EN 50600-2-2: Power distribution (Availability Classes 1-4)\n- EN 50600-2-3: Environmental control (Availability Classes 1-4)\n- EN 50600-2-4: Telecommunications cabling\n- EN 50600-2-5: Security systems\n- EN 50600-3-1: Management and operational information\n- EN 50600-4-x: KPIs (PUE, REF, WUE, CUE, etc.)\n\n**Key differences from Uptime Institute:**\n- **Standards-based vs proprietary:** EN 50600 is an open standard; Uptime Tier is proprietary certification\n- **Granular classes:** EN 50600 allows different availability classes for power, cooling, and security independently (e.g., Class 3 power + Class 2 cooling)\n- **KPI framework:** EN 50600-4 defines standardised metrics (PUE, REF, WUE, CUE) with measurement methodology\n- **European focus:** Increasingly referenced in EU regulations and procurement\n- **Protection classes:** Separate classification for physical security (1-4)\n\n**2025 status:** EN 50600 is gaining adoption in Europe, often used alongside or instead of Uptime Institute certification. EU Energy Efficiency Directive references EN 50600-4 KPIs for mandatory reporting.',
    tags: ['standards', 'EN-50600', 'European', 'classification']
  },
  {
    front: 'What is PUE, and what are considered good PUE values in 2025?',
    back: '**PUE (Power Usage Effectiveness):**\n\n**PUE = Total Facility Power / IT Equipment Power**\n\n- A PUE of 1.0 means all power goes to IT (impossible in practice)\n- Overhead includes cooling, power distribution losses, lighting, security\n\n**2025 benchmarks:**\n- **Industry average:** ~1.55 (improving slowly)\n- **Good (new enterprise build):** 1.2-1.3\n- **Excellent (purpose-built):** 1.1-1.2\n- **Best-in-class (hyperscale):** 1.05-1.10\n- **Liquid-cooled AI facilities:** 1.02-1.05\n- **Google fleet average (2024 reported):** 1.10\n\n**Measurement per EN 50600-4-2:**\n- PUE Category 1: Basic (utility meter / IT UPS output)\n- PUE Category 2: Intermediate (adds mechanical/electrical sub-metering)\n- PUE Category 3: Advanced (per-device metering, continuous measurement)\n\n**Limitations of PUE:**\n- Does not account for IT efficiency (a facility with wasteful servers can have good PUE)\n- Favours warm climates (less cooling needed) and high-density deployments\n- Does not capture water consumption, carbon, or renewable energy\n\n**Complementary metrics:** WUE, CUE, REF (Renewable Energy Factor) provide a more complete picture.',
    tags: ['standards', 'PUE', 'efficiency', 'metrics']
  },
  {
    front: 'What are WUE and CUE, and why are they important alongside PUE?',
    back: '**WUE (Water Usage Effectiveness):**\n\n**WUE = Annual Water Usage (litres) / IT Equipment Energy (kWh)**\n\n- Measures water consumed by cooling systems (evaporative cooling towers, humidifiers)\n- Unit: L/kWh\n- **Good target:** < 0.5 L/kWh\n- **Best-in-class (no evaporative):** 0 L/kWh (dry cooling or liquid cooling)\n- **Typical with cooling towers:** 1.0-2.0 L/kWh\n\n**Why it matters:** A 100MW data centre with cooling towers can consume 1-3 million litres of water per day. Water scarcity is a growing concern globally.\n\n---\n\n**CUE (Carbon Usage Effectiveness):**\n\n**CUE = Total CO2 Emissions (kgCO2e) / IT Equipment Energy (kWh)**\n\n- Measures carbon intensity of data centre operations\n- Unit: kgCO2e/kWh\n- **Target:** 0.0 (100% renewable energy)\n- Depends heavily on grid carbon intensity\n\n**2025 context:**\n- EU Corporate Sustainability Reporting Directive (CSRD) mandates carbon disclosure\n- Scope 1: Direct emissions (diesel generators)\n- Scope 2: Indirect from purchased electricity\n- Scope 3: Supply chain, construction, embedded carbon\n- Science-Based Targets initiative (SBTi) alignment expected for large operators\n\n**EN 50600-4-3 (REF -- Renewable Energy Factor):** Measures proportion of energy from renewable sources.',
    tags: ['standards', 'WUE', 'CUE', 'sustainability', 'water']
  },
  {
    front: 'What is TIA-942, and what does it cover?',
    back: '**TIA-942 (Telecommunications Infrastructure Standard for Data Centres):**\n\nPublished by the Telecommunications Industry Association. Defines the requirements for data centre telecommunications infrastructure.\n\n**Key content:**\n\n**1. Data centre space types:**\n- Entrance Room (ER): Demarcation point for carrier services\n- Main Distribution Area (MDA): Core routers, switches, SAN directors\n- Horizontal Distribution Area (HDA): Row/zone-level distribution\n- Zone Distribution Area (ZDA): Optional consolidation point\n- Equipment Distribution Area (EDA): Server racks\n\n**2. Cabling topology:**\n- Structured cabling hierarchy from ER through MDA/HDA to EDA\n- Redundant cabling paths for higher tiers\n- Cross-connect vs interconnect models\n\n**3. Rated tiers (1-4):**\n- Similar to but not identical to Uptime Institute tiers\n- Covers telecommunications infrastructure specifically\n\n**4. Infrastructure requirements:**\n- Cable pathway sizing, separation of power and data cables\n- Bonding and grounding for telecommunications\n- Fibre and copper specifications per application\n\n**2025 status:** TIA-942-B (revised) is current. Used primarily in North America. Often referenced alongside BICSI-002 (Data Centre Design and Implementation Best Practices). In Europe, EN 50600 series is more commonly used.',
    tags: ['standards', 'TIA-942', 'cabling', 'telecommunications']
  },
  {
    front: 'What are the EU energy efficiency and sustainability regulations affecting data centres in 2025?',
    back: '**1. EU Energy Efficiency Directive (EED) 2023/1791 -- Article 12:**\n- Mandatory for data centres >500kW IT load\n- Must report PUE, WUE, renewable energy share, waste heat reuse, temperature set points\n- First reporting deadline: 15 May 2024, annually thereafter\n- Data published in a public EU database\n\n**2. Corporate Sustainability Reporting Directive (CSRD):**\n- Large companies must report Scope 1, 2, and 3 emissions\n- Data centres are major Scope 2 contributors\n- Mandatory assurance of sustainability reports\n\n**3. EU Taxonomy Regulation:**\n- Defines which economic activities are "environmentally sustainable"\n- Data centres must meet PUE thresholds and climate adaptation criteria to qualify\n- Affects access to green financing\n\n**4. F-Gas Regulation (2024 revision):**\n- Accelerated phase-down of high-GWP refrigerants\n- Bans on HFCs with GWP >150 in new equipment from 2027\n\n**5. EU Code of Conduct for Data Centre Energy Efficiency:**\n- Voluntary best practices (now effectively mandatory via EED reporting)\n- Covers IT, cooling, power, monitoring\n\n**6. National regulations:**\n- Germany (EnEfG): PUE < 1.3 by 2027 for new DCs, waste heat reuse mandate\n- France: Water usage caps for DCs in water-stressed areas\n- Ireland: Moratorium discussions on new DC grid connections\n\n**Impact:** Sustainability is no longer optional -- it directly affects permitting, financing, and operating costs.',
    tags: ['standards', 'EU-regulations', 'sustainability', 'EED']
  },
  {
    front: 'What is the difference between Uptime Institute certification and ISO 22237?',
    back: '**Uptime Institute Tier Certification:**\n- **Proprietary** certification programme\n- Four tiers (I-IV) with prescriptive requirements\n- Certifies the entire facility holistically (power + cooling + architecture)\n- Three certifications: Design Documents, Constructed Facility, Operational Sustainability\n- Globally recognised, especially in colocation market\n- Requires engagement with Uptime Institute consultants\n- Cost: significant (six figures for full certification)\n\n**ISO 22237:**\n- **International standard** (replacing/complementing EN 50600 at ISO level)\n- Based on EN 50600 series\n- Availability classes (1-4) applied independently to power, cooling, physical security\n- More flexible: a facility can be Class 3 power + Class 2 cooling\n- Certified by any accredited ISO certification body\n- Potentially lower certification cost\n- Includes KPI measurement standards (from EN 50600-4)\n\n**Key differences:**\n| Aspect | Uptime Institute | ISO 22237 |\n|--------|-----------------|----------|\n| Type | Proprietary | Open standard |\n| Granularity | Holistic tier | Per-subsystem class |\n| Flexibility | Fixed tier packages | Mix-and-match classes |\n| Auditor | Uptime Institute | Any accredited body |\n| Market recognition | Highest (legacy) | Growing (especially EU) |\n\n**2025 trend:** ISO 22237 / EN 50600 certification is growing, particularly in Europe where EU regulations reference these standards. Many organisations pursue both.',
    tags: ['standards', 'ISO-22237', 'uptime-institute', 'certification']
  },
  {
    front: 'What Scope 1, 2, and 3 emissions apply to data centres, and how are they reported?',
    back: '**Scope 1 -- Direct emissions from owned/controlled sources:**\n- Diesel/HVO combustion in backup generators\n- Refrigerant leaks from cooling systems (F-gases)\n- On-site natural gas consumption (if used)\n- Company vehicles\n\n**Scope 2 -- Indirect emissions from purchased energy:**\n- Electricity from the grid (by far the largest category)\n- Purchased steam, heating, or cooling\n- Two methods: location-based (grid average) and market-based (accounting for RECs/PPAs)\n\n**Scope 3 -- Value chain emissions (upstream and downstream):**\n- Embodied carbon in servers, networking equipment, construction materials\n- Business travel, employee commuting\n- Waste disposal\n- Customer use of services (for cloud providers)\n- Water supply and treatment\n\n**Reporting frameworks:**\n- GHG Protocol (Corporate Standard) -- defines Scope 1/2/3\n- CDP (Carbon Disclosure Project) -- annual questionnaire\n- EU CSRD / ESRS -- mandatory in EU for large companies\n- Science-Based Targets initiative (SBTi) -- validates reduction targets\n\n**Data centre-specific actions:**\n- Scope 1: Switch to HVO fuel, reduce refrigerant leaks, use low-GWP refrigerants\n- Scope 2: Renewable energy PPAs, on-site solar, green tariffs\n- Scope 3: Sustainable procurement, extend hardware lifecycle, circular economy\n\n**2025 standard:** Major operators (hyperscale and large colo) publish annual sustainability reports with all three scopes. Scope 3 reporting is the frontier -- complex but increasingly expected.',
    tags: ['standards', 'carbon', 'scope-1-2-3', 'sustainability', 'reporting']
  },
  {
    front: 'What is the Energy Reuse Factor (ERF) and how does it relate to PUE?',
    back: '**ERF (Energy Reuse Factor):**\n\n**ERF = Reused Energy / Total Facility Energy**\n\n- Measures the proportion of total energy that is captured and reused productively outside the data centre\n- Value between 0 (no reuse) and approaching 1 (maximum reuse)\n- Defined in EN 50600-4-6\n\n**Relationship to PUE:**\n\n**PUE_adjusted = PUE x (1 - ERF)**\n\n**Example:**\n- Facility PUE = 1.3, ERF = 0.2 (20% of heat reused for district heating)\n- Adjusted PUE = 1.3 x (1 - 0.2) = 1.04\n\n**Why it matters:**\n- A data centre that reuses waste heat effectively can claim credit for displacing other energy sources\n- District heating: waste heat replaces gas boilers, avoiding those emissions\n- EU Energy Efficiency Directive encourages waste heat reuse and ERF reporting\n\n**Practical ERF values:**\n- Most data centres: 0 (no heat reuse)\n- With district heating connection: 0.1-0.3\n- With liquid cooling and optimised heat recovery: 0.2-0.5\n- Theoretical maximum depends on heating demand proximity and seasonal variation\n\n**Limitation:** ERF depends on external demand for heat -- seasonal in most climates. Summer ERF may be near zero even if winter ERF is high.',
    tags: ['standards', 'ERF', 'waste-heat', 'PUE', 'metrics']
  },
  {
    front: 'What is ASHRAE TC 9.9, and what publications does it produce for data centres?',
    back: '**ASHRAE Technical Committee 9.9** -- Mission Critical Facilities, Data Centers, Technology Spaces, and Electronic Equipment.\n\n**Key publications:**\n\n**1. Thermal Guidelines for Data Processing Environments (5th ed):**\n- Defines recommended and allowable temperature/humidity envelopes (A1-A4, B, C classes)\n- The foundational reference for data centre environmental control\n\n**2. Gaseous and Particulate Contamination Guidelines:**\n- Defines G1/GX severity levels\n- Corrosion coupon monitoring methodology\n- Filtration recommendations\n\n**3. IT Equipment Power Trends (updated regularly):**\n- Tracks server power consumption trends\n- Informs capacity planning and cooling design\n\n**4. Liquid Cooling Guidelines:**\n- Design guidance for direct-to-chip and immersion cooling\n- Facility water temperature recommendations\n- Material compatibility guidelines\n\n**5. PUE: A Comprehensive Examination (with The Green Grid):**\n- Measurement methodology for PUE\n- Categories of measurement accuracy\n\n**6. Best Practices for Airflow Management:**\n- Containment strategies\n- CFD validation methods\n\n**Why it matters:** ASHRAE TC 9.9 publications are the most widely referenced technical guidelines in data centre design globally. They are not mandatory standards but are treated as authoritative best practice by designers, operators, and equipment manufacturers.',
    tags: ['standards', 'ASHRAE', 'TC-9.9', 'guidelines']
  }
];

// ---------- SETS DEFINITION ----------
const sets = [
  {
    name: '1. Power to the Data Centre',
    description: 'Utility feeds, transformers, voltage levels, surge protection, switchgear, power factor, and harmonic management for data centre power intake.',
    cards: unit1
  },
  {
    name: '2. Distribution in the Data Centre',
    description: 'Switchboards, PDUs, RPPs, circuit protection, power factor correction, IT load calculations, stranded power, and busbar trunking.',
    cards: unit2
  },
  {
    name: '3. Standby Power',
    description: 'Generators, ATS, STS, fuel systems (diesel, HVO), UPS topologies (online, line-interactive, rotary/DRUPS), battery technologies (VRLA, lithium-ion, flywheel), and modular UPS.',
    cards: unit3
  },
  {
    name: '4. Cooling Fundamentals',
    description: 'Sensible vs latent heat, psychrometrics, CRAC/CRAH, in-row cooling, rear door heat exchangers, free cooling, hot/cold aisle containment, and liquid cooling (direct-to-chip, immersion).',
    cards: unit4
  },
  {
    name: '5. Heat Rejection',
    description: 'Chillers (air-cooled, water-cooled), cooling towers, dry coolers, adiabatic cooling, economisers, refrigerants, waste heat reuse, COP, and delta-T optimisation.',
    cards: unit5
  },
  {
    name: '6. Environmental Parameters',
    description: 'ASHRAE A1-A4 thermal envelopes, humidity control (dew point vs RH), particulate and gaseous contamination, altitude effects, environmental monitoring, and fire suppression.',
    cards: unit6
  },
  {
    name: '7. IT Infrastructure & Environment',
    description: 'Rack power density (2025: 40-100kW for AI/GPU), structured cabling, raised floor vs overhead, DCIM, rack specifications, physical security, OCP, and 48V DC distribution.',
    cards: unit7
  },
  {
    name: '8. Regulatory & Standards',
    description: 'Uptime Institute tiers (I-IV), EN 50600, TIA-942, ISO 22237, ASHRAE TC 9.9, PUE/WUE/CUE/ERF metrics, EU Energy Efficiency Directive, carbon reporting (Scope 1/2/3).',
    cards: unit8
  }
];

async function main() {
  console.log('Creating CDCDP topic...');
  const topic = await post('/api/topics', {
    name: 'CDCDP \u2014 Data Centre Design',
    description: 'Certified Data Centre Design Professional \u2014 power distribution, cooling, standby generation, environmental parameters, IT infrastructure, and regulatory compliance. Based on CNet Training curriculum, updated for 2025.',
    color: '#0891b2',
    icon: 'book'
  });
  console.log('Created topic:', topic.id, topic.name);

  let totalCards = 0;

  for (const set of sets) {
    console.log('\nCreating set:', set.name);
    const cardSet = await post('/api/topics/' + topic.id + '/sets', {
      name: set.name,
      description: set.description
    });
    console.log('  Set ID:', cardSet.id, '(' + set.cards.length + ' cards)');

    let setCount = 0;
    for (const c of set.cards) {
      await post('/api/sets/' + cardSet.id + '/cards', {
        tags: c.tags,
        front: { media_blocks: [{ block_type: 'text', text_content: c.front }] },
        back: { media_blocks: [{ block_type: 'text', text_content: c.back }] }
      });
      setCount++;
      totalCards++;
      if (setCount % 5 === 0) console.log('    ...', setCount, '/', set.cards.length);
    }
    console.log('  Done:', setCount, 'cards');
  }

  console.log('\n=== COMPLETE ===');
  console.log('Topic: CDCDP \u2014 Data Centre Design');
  console.log('Sets:', sets.length);
  console.log('Total cards:', totalCards);
}

main().catch(e => console.error('Error:', e));
