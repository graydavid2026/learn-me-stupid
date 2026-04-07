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

const cat1 = [
  {
    front: 'What symbol represents a Power Transformer on a single-line diagram?',
    back: 'Two overlapping circles (or two adjacent coils). Represents voltage step-up or step-down between systems (e.g., 138 kV to 13.8 kV, or 480V to 208/120V).',
    tags: ['symbols', 'transformer']
  },
  {
    front: 'What symbol represents a Circuit Breaker?',
    back: 'A square or rectangle on the line (medium/high voltage), or an arc bridging a gap (low voltage). Labeled with ANSI device number **52**. Provides automatic fault interruption.',
    tags: ['symbols', 'protection']
  },
  {
    front: 'What symbol represents a Disconnect Switch (Isolator)?',
    back: 'An angled line breaking away from the main conductor — like an open knife switch. Used for physical isolation during maintenance. Has **NO fault-interrupting capability**.',
    tags: ['symbols', 'switching']
  },
  {
    front: 'What symbol represents a Busbar?',
    back: 'A solid, heavy horizontal or vertical line. Acts as a common electrical node where multiple feeders connect. Often labeled with voltage and bus designation (e.g., BUS A, 480V).',
    tags: ['symbols', 'distribution']
  },
  {
    front: 'What symbol represents a Generator?',
    back: 'A circle with the letter **"G"** inside. In data centers, this is typically a diesel standby/emergency generator. Connected downstream of an ATS.',
    tags: ['symbols', 'generation']
  },
  {
    front: 'What symbol represents a Current Transformer (CT)?',
    back: 'Two small half-circles (or a donut shape) around the conductor line. Scales down high current to a safe measurable level (typically **5A secondary**) for metering and relay protection.',
    tags: ['symbols', 'metering', 'protection']
  },
  {
    front: 'What symbol represents a Potential Transformer (PT/VT)?',
    back: 'Similar to a power transformer but smaller — two small circles. Steps voltage down to **120V** for metering and protective relaying.',
    tags: ['symbols', 'metering', 'protection']
  },
  {
    front: 'What symbol represents a Protective Relay?',
    back: 'A circle (or diamond) containing a number — the **ANSI device function number**. E.g., "50/51" for instantaneous/time-overcurrent, "87" for differential.',
    tags: ['symbols', 'protection']
  },
  {
    front: 'What does the Ground/Earth symbol look like?',
    back: 'Three (or more) horizontal lines decreasing in length, stacked vertically. Indicates connection to earth ground. Critical for equipment safety and fault current paths.',
    tags: ['symbols', 'grounding']
  },
  {
    front: 'What symbol represents a Surge Arrestor (Lightning Arrestor)?',
    back: 'A lightning bolt terminating at a ground symbol, or a rectangle labeled "SA" or "LA". Protects equipment from transient overvoltages (lightning, switching surges).',
    tags: ['symbols', 'protection']
  },
  {
    front: 'What symbol represents a Capacitor Bank?',
    back: 'Two parallel lines with a gap (one flat, one curved). Used for **power factor correction**, reducing reactive power demand and utility penalties.',
    tags: ['symbols', 'power-quality']
  },
  {
    front: 'What symbol represents a Motor?',
    back: 'A circle with the letter **"M"** inside. Common on industrial SLDs showing motor loads fed from MCCs (Motor Control Centers).',
    tags: ['symbols', 'loads']
  },
  {
    front: 'What symbol represents a Fuse?',
    back: 'An "S" curve or a rectangle with a line through it on the conductor. Provides overcurrent protection by melting an internal element. Common in MV switchgear and panel protection.',
    tags: ['symbols', 'protection']
  },
  {
    front: 'What does an ATS (Automatic Transfer Switch) look like on a single-line diagram?',
    back: 'Two incoming lines converging on a switching symbol (often shown as a double-throw mechanism) feeding one outgoing line. Transfers load between **Normal** and **Emergency** sources.',
    tags: ['symbols', 'switching', 'data-center']
  },
  {
    front: 'What symbol represents a UPS (Uninterruptible Power Supply)?',
    back: 'A labeled rectangle or block labeled "UPS", sometimes showing rectifier, battery, and inverter sub-blocks. Critical in data center SLDs between utility/generator power and IT loads.',
    tags: ['symbols', 'data-center', 'power-quality']
  },
  {
    front: 'What does a PDU/RPP look like on a data center single-line diagram?',
    back: 'A labeled rectangle — **"PDU"** (Power Distribution Unit) or **"RPP"** (Remote Power Panel). Sits at the end of the power chain, distributing power to individual rack circuits. Shows breaker schedule.',
    tags: ['symbols', 'data-center', 'distribution']
  },
  {
    front: 'What symbol represents a Panelboard on a single-line diagram?',
    back: 'A vertical rectangle (often with a short horizontal busbar inside and branch circuit breakers shown as small ticks). Labeled with panel name, voltage, and phase configuration.',
    tags: ['symbols', 'distribution']
  },
  {
    front: 'What does an MCC (Motor Control Center) look like on a single-line?',
    back: 'A large labeled rectangle or a vertical bus with multiple branch units shown as small rectangles (each representing a motor starter/bucket). Common in industrial facilities.',
    tags: ['symbols', 'industrial', 'loads']
  },
  {
    front: 'What symbol represents a Static Transfer Switch (STS)?',
    back: 'Similar to an ATS but labeled "STS" — two incoming feeds with a solid-state switching element. Transfers between sources in **less than 4ms** (sub-cycle). Used in data centers upstream of critical IT loads.',
    tags: ['symbols', 'data-center', 'switching']
  },
  {
    front: 'What symbol represents a Variable Frequency Drive (VFD)?',
    back: 'A rectangle labeled "VFD" or shown with rectifier/inverter blocks inside. Controls motor speed by varying output frequency. Common in industrial and data center mechanical systems (chillers, pumps, fans).',
    tags: ['symbols', 'industrial', 'mechanical']
  }
];

const cat2 = [
  {
    front: 'ANSI Device Number 25 — what does it represent?',
    back: '**Synchronism-Check Relay (Synch Check).** Verifies that voltage, frequency, and phase angle are matched before closing a breaker to parallel two sources (e.g., generator to bus).',
    tags: ['ansi-device', 'protection', 'generation']
  },
  {
    front: 'ANSI Device Number 27 — what does it represent?',
    back: '**Undervoltage Relay.** Operates when voltage drops below a set threshold. Used to trip breakers or initiate transfer to protect equipment from low voltage conditions.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 32 — what does it represent?',
    back: '**Directional Power Relay (Reverse Power).** Detects power flowing in the wrong direction. Used on generators to prevent **motoring** — if the prime mover fails, the generator becomes a motor load.',
    tags: ['ansi-device', 'protection', 'generation']
  },
  {
    front: 'ANSI Device Number 46 — what does it represent?',
    back: '**Negative-Sequence (Reverse Phase) Current Relay.** Detects unbalanced phase currents. Protects motors and generators from overheating caused by negative-sequence current components.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 50 — what does it represent?',
    back: '**Instantaneous Overcurrent Relay.** Trips immediately (no intentional delay) when current exceeds a high set-point. Protects against short circuits / bolted faults.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 51 — what does it represent?',
    back: '**Time-Delay Overcurrent Relay (inverse time).** Trip time decreases as fault current increases. Allows coordination with downstream devices — fundamental to **selective coordination**.',
    tags: ['ansi-device', 'protection', 'coordination']
  },
  {
    front: 'What is the difference between ANSI 50 and 51?',
    back: '**50** = Instantaneous overcurrent (no delay, high set-point, for close-in faults).\n**51** = Time-delay overcurrent (inverse time curve, allows coordination).\n\nOften used together as **50/51**. The 50 element catches severe faults instantly; the 51 element provides time-graded protection for coordination with downstream devices.',
    tags: ['ansi-device', 'protection', 'coordination']
  },
  {
    front: 'ANSI Device Number 52 — what does it represent?',
    back: '**AC Circuit Breaker.** The breaker itself. When you see "52" on an SLD, it labels the circuit breaker device. Often combined: **52/50/51** means a breaker with instantaneous and time-overcurrent protection.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 59 — what does it represent?',
    back: '**Overvoltage Relay.** Operates when voltage exceeds a set threshold. Protects equipment from sustained overvoltage — important for generator protection and utility interconnection.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 81 — what does it represent?',
    back: '**Frequency Relay (Over/Under).** Operates on abnormal system frequency. Critical for generator protection (81O/81U) and load shedding schemes in islanded systems.',
    tags: ['ansi-device', 'protection', 'generation']
  },
  {
    front: 'ANSI Device Number 86 — what does it represent?',
    back: '**Lockout Relay.** A hand-reset relay that trips and locks out a breaker after a serious fault. Requires **manual reset** — ensures human verification before re-energizing after a major event.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 87 — what does it represent?',
    back: '**Differential Relay.** Compares current entering vs. leaving a zone (transformer, bus, generator). Any difference indicates an internal fault → trips instantly. Very fast, very selective.',
    tags: ['ansi-device', 'protection']
  },
  {
    front: 'ANSI Device Number 51N (or 51G) — what does it represent?',
    back: '**Ground Fault Overcurrent Relay (time-delay).** Monitors neutral/ground current for ground faults. The "N" or "G" suffix means it\'s applied to the neutral or ground circuit rather than phase conductors.',
    tags: ['ansi-device', 'protection', 'grounding']
  },
  {
    front: 'ANSI Device Number 79 — what does it represent?',
    back: '**AC Reclosing Relay.** Automatically recloses a breaker after a trip, typically after a time delay. Common on utility transmission/distribution lines. Less common inside facilities — used mainly at the utility interconnection point.',
    tags: ['ansi-device', 'protection', 'utility']
  }
];

const cat3 = [
  {
    front: 'What are the typical TRANSMISSION voltage levels in North America?',
    back: '**69 kV, 115 kV, 138 kV, 230 kV, 345 kV, 500 kV, 765 kV.**\n\nThese carry bulk power over long distances from generation to substations. Rarely seen on facility SLDs except at the utility point of delivery.',
    tags: ['voltage', 'transmission']
  },
  {
    front: 'What are the typical SUB-TRANSMISSION voltage levels?',
    back: '**34.5 kV and 69 kV** are common sub-transmission voltages. Large industrial facilities or data center campuses may take service at these levels with their own HV substation.',
    tags: ['voltage', 'transmission']
  },
  {
    front: 'What are the typical MEDIUM VOLTAGE (MV) distribution levels?',
    back: '**4.16 kV, 12.47 kV, 13.2 kV, 13.8 kV, and 34.5 kV.** Most data centers and industrial facilities receive power at 12.47 kV or 13.8 kV from the utility. Internal MV distribution may use 15 kV class switchgear.',
    tags: ['voltage', 'distribution']
  },
  {
    front: 'What are the typical LOW VOLTAGE (LV) levels in data centers and industrial facilities?',
    back: '**480/277V** (3-phase, 4-wire wye) is the workhorse for large loads, mechanical equipment, and UPS input.\n**208/120V** (3-phase, 4-wire wye) serves IT equipment and general receptacles.\nSome industrial: **600V** in Canada.',
    tags: ['voltage', 'distribution', 'data-center']
  },
  {
    front: 'Trace the typical power path in a Tier III data center from utility to rack.',
    back: 'Utility MV (13.8 kV) → **Main MV Switchgear** → **Step-down Transformer** (13.8 kV to 480V) → **LV Switchgear/Switchboard** → **ATS** (Normal + Generator) → **UPS** → **STS** (Static Transfer Switch) → **PDU** (480V to 208/120V) → **RPP** → **Rack PDU** → Server.',
    tags: ['power-path', 'data-center', 'topology']
  },
  {
    front: 'What is the typical power path in an industrial facility from utility to motor?',
    back: 'Utility MV (13.8 kV) → **Main Switchgear** → **Step-down Transformer** (13.8 kV to 4.16 kV or 480V) → **MV or LV Switchgear** → **MCC** (Motor Control Center) → **Starter/VFD** → Motor.\n\nLarge motors may be fed directly at MV.',
    tags: ['power-path', 'industrial', 'topology']
  },
  {
    front: 'What voltage class does "15 kV class" switchgear refer to?',
    back: '15 kV class covers systems rated from **2.4 kV up to 15 kV** (nominal). It\'s rated for a maximum of **15.5 kV** and a BIL of **95 kV or 110 kV**. Covers the most common MV distribution voltages (12.47 kV, 13.2 kV, 13.8 kV).',
    tags: ['voltage', 'switchgear', 'equipment-ratings']
  },
  {
    front: 'What is the difference between 480Y/277V and 480V delta?',
    back: '**480Y/277V** is a 4-wire wye system — gives you 277V line-to-neutral (for lighting) and 480V line-to-line.\n\n**480V delta** is a 3-wire system with no neutral — used for motor loads only.\n\nData centers almost always use **wye** for the neutral.',
    tags: ['voltage', 'winding-config', 'data-center']
  },
  {
    front: 'What does "dual fed" or "redundant utility feed" mean on a data center SLD?',
    back: 'Two independent utility feeders (often from separate substations or utility circuits) provide power to the facility. Each can carry the **full load independently**. This is the first layer of redundancy at the top of the SLD.',
    tags: ['topology', 'redundancy', 'data-center']
  },
  {
    front: 'What is the difference between a Switchboard and Switchgear?',
    back: '**Switchgear:** Metal-enclosed, drawout breakers, rated for higher fault currents — used at MV and main LV levels.\n\n**Switchboards:** Less robust, bolt-on or plug-in breakers, downstream distribution.\n\nSwitchgear is **upstream** of switchboards.',
    tags: ['equipment', 'distribution']
  }
];

const cat4 = [
  {
    front: 'What direction is a single-line diagram typically read?',
    back: '**Top to bottom** (most common) or left to right. Power flows from the highest voltage source (utility/transmission) at the top down to the lowest voltage loads (panels/racks) at the bottom.',
    tags: ['conventions', 'reading-sld']
  },
  {
    front: 'On an SLD, what does a filled/solid dot at a junction point mean?',
    back: 'It indicates an **electrical connection** — the conductors are physically joined. Without the dot, crossing lines are assumed to **NOT** be connected (they just cross over each other on the drawing).',
    tags: ['conventions', 'reading-sld']
  },
  {
    front: 'What information is typically shown next to a transformer symbol on an SLD?',
    back: '**kVA or MVA** rating, **primary/secondary voltages**, **winding configuration** (delta-wye, wye-wye), **impedance (%Z)**, and the **equipment tag/name**.\n\nE.g., "TX-1, 2000 kVA, 13.8 kV Δ – 480/277V Y, 5.75% Z".',
    tags: ['conventions', 'transformer', 'annotations']
  },
  {
    front: 'What does "Δ–Y" (Delta-Wye) mean next to a transformer on an SLD?',
    back: 'Primary winding is connected in **Delta** (no neutral), secondary in **Wye** (provides a neutral). This is the most common configuration for stepping down MV to LV. Provides **30° phase shift** and isolates ground faults.',
    tags: ['conventions', 'transformer', 'winding-config']
  },
  {
    front: 'What does a dashed or dotted line typically represent on an SLD?',
    back: '**Future equipment** or a future expansion. It may also indicate a **control/signal wire** (as opposed to a power conductor), or equipment that is not yet installed but is planned.',
    tags: ['conventions', 'reading-sld']
  },
  {
    front: 'What does "N.O." and "N.C." mean on a single-line diagram?',
    back: '**N.O.** = Normally Open (breaker/switch is open during normal operation, used as a tie or reserve).\n\n**N.C.** = Normally Closed (breaker/switch is closed during normal operation, actively carrying load).',
    tags: ['conventions', 'switching']
  },
  {
    front: 'What is a "tie breaker" on a single-line diagram and why is it important?',
    back: 'A breaker connecting two buses (often shown as **N.O.** between Bus A and Bus B). Allows load transfer between sources.\n\nIn data centers and industrial, enables maintenance on one source without total shutdown — **key to redundancy**.',
    tags: ['conventions', 'topology', 'redundancy']
  },
  {
    front: 'What does "AIC" or "kAIC" mean when labeled on a breaker in an SLD?',
    back: '**Ampere Interrupting Capacity** (in thousands = kAIC). The maximum fault current the breaker can safely interrupt. Must be **equal to or greater than** the available fault current at that point in the system.',
    tags: ['conventions', 'protection', 'equipment-ratings']
  },
  {
    front: 'What is a "Main-Tie-Main" configuration on an SLD?',
    back: 'Two separate utility/source feeds each through a **main breaker** into their own bus, with a **tie breaker** (usually N.O.) between the buses.\n\nProvides redundancy — if one source fails, the tie closes to feed both buses from the remaining source.',
    tags: ['conventions', 'topology', 'redundancy']
  },
  {
    front: 'Why are short-circuit current values (e.g., 65 kA) shown at various points on an SLD?',
    back: 'They indicate the **maximum available fault current** at that location. Every protective device downstream must be rated to interrupt at least that amount.\n\nThis drives equipment ratings, coordination studies, and **arc flash calculations**.',
    tags: ['conventions', 'protection', 'fault-analysis']
  },
  {
    front: 'What does the label "E/G" or a generator symbol with "EPSS" mean on a data center SLD?',
    back: '**Emergency Power Supply System** — the diesel generator(s) and associated switchgear that provide standby power during utility outage. "E/G" = Engine/Generator. Connected via **ATS** to critical loads.',
    tags: ['conventions', 'data-center', 'generation']
  },
  {
    front: 'What does "%Z" (percent impedance) on a transformer tell you on an SLD?',
    back: 'The transformer\'s internal impedance expressed as a percentage.\n\n**Lower %Z** = higher available fault current on secondary side.\n**Higher %Z** = lower fault current but more voltage drop under load.\n\nTypical range: **2% to 10%**. Critical input for short-circuit and coordination studies.',
    tags: ['conventions', 'transformer', 'fault-analysis']
  },
  {
    front: 'What does a triangle (Δ) vs. a star/Y symbol mean in transformer winding notation?',
    back: '**Δ (Delta)** = windings connected in a closed loop, no neutral point available.\n**Y (Wye/Star)** = windings connected at a common neutral point, providing a neutral conductor.\n\nThe notation "Dyn11" (IEC) or "Δ-Y" (ANSI) describes primary-secondary winding connections.',
    tags: ['conventions', 'transformer', 'winding-config']
  },
  {
    front: 'What do the labels "A" and "B" (or "1" and "2") on buses mean in a data center SLD?',
    back: 'They indicate **redundant power paths**. Bus A and Bus B are independently fed so that a failure on one path does not take down IT loads.\n\nDual-corded equipment connects to both paths. This is the fundamental concept behind **2N redundancy**.',
    tags: ['conventions', 'data-center', 'redundancy']
  }
];

const cat5 = [
  {
    front: 'What is the difference between N, N+1, and 2N redundancy as shown on SLDs?',
    back: '**N** = no redundancy (single path).\n**N+1** = one additional component beyond what\'s needed (e.g., 3 UPS modules where only 2 are needed).\n**2N** = fully duplicated, independent paths from source to load.\n**2(N+1)** = combines both.\n\nThe SLD topology visually shows which configuration is used.',
    tags: ['data-center', 'redundancy', 'topology']
  },
  {
    front: 'What is an STS (Static Transfer Switch) and where does it sit in a data center SLD?',
    back: 'A solid-state switch that transfers a single-corded load between two independent power sources in **under 4 milliseconds** (sub-cycle).\n\nSits **downstream of two UPS systems** and **upstream of the PDU**. Provides 2N-like protection for single-corded equipment.',
    tags: ['data-center', 'switching', 'redundancy']
  },
  {
    front: 'What is the role of a maintenance bypass on a UPS shown on an SLD?',
    back: 'A manual bypass path (shown as a parallel line or switch around the UPS block) that allows utility power to feed loads directly while the UPS is taken offline for service.\n\n**Loads are unprotected during bypass** — scheduled carefully.',
    tags: ['data-center', 'ups', 'maintenance']
  },
  {
    front: 'What is a "dual-corded" load and how is it shown on an SLD?',
    back: 'Equipment with **two independent power supply inputs**, each connected to a separate power path (A and B). Shown on the SLD as a load block with two incoming lines from separate distribution paths.\n\nServers, storage, and network gear in data centers are typically dual-corded.',
    tags: ['data-center', 'redundancy', 'loads']
  },
  {
    front: 'Where do generators connect in a typical data center SLD?',
    back: 'Generators connect via **ATS (Automatic Transfer Switches)**. The ATS sits between the utility transformer secondary and the downstream distribution.\n\nOn utility failure, the ATS transfers to the generator feed after the generator starts and stabilizes (typically **10 seconds**).',
    tags: ['data-center', 'generation', 'topology']
  },
  {
    front: 'What is a "day tank" vs. "bulk tank" and does it appear on electrical SLDs?',
    back: '**Day tanks** (small, near the generator) and **bulk tanks** (large, central fuel storage) are part of the fuel system.\n\nThey typically do **NOT** appear on the electrical SLD — they appear on mechanical/fuel system drawings. However, fuel transfer pumps may show up as loads on the SLD.',
    tags: ['data-center', 'generation', 'mechanical']
  }
];

async function main() {
  // Create topic
  const topic = await post('/api/topics', {
    name: 'Single-Line Diagrams (SLD)',
    description: 'Single-Line Diagram literacy — symbols, ANSI device numbers, voltage hierarchy, reading conventions, and data center power topologies. Transmission level to panel level.',
    color: '#d97706',
    icon: 'book'
  });
  console.log('Created topic:', topic.id, topic.name);

  // Create card sets per category
  const sets = {};

  sets.cat1 = await post('/api/topics/' + topic.id + '/sets', {
    name: '1. Symbols & Components',
    description: '20 cards — IEEE/ANSI standard electrical symbols as they appear on single-line diagrams.'
  });
  console.log('Created set:', sets.cat1.name);

  sets.cat2 = await post('/api/topics/' + topic.id + '/sets', {
    name: '2. ANSI Device Numbers',
    description: '14 cards — Protective relay and device function numbers (25, 27, 32, 46, 50, 51, 52, 59, 79, 81, 86, 87, 51N).'
  });
  console.log('Created set:', sets.cat2.name);

  sets.cat3 = await post('/api/topics/' + topic.id + '/sets', {
    name: '3. Voltage Hierarchy & Power Path',
    description: '10 cards — Transmission, sub-transmission, MV, LV voltage levels and typical power paths in data centers and industrial facilities.'
  });
  console.log('Created set:', sets.cat3.name);

  sets.cat4 = await post('/api/topics/' + topic.id + '/sets', {
    name: '4. SLD Reading Conventions',
    description: '14 cards — How to read annotations, junction dots, N.O./N.C., transformer labels, %Z, AIC ratings, and topology patterns.'
  });
  console.log('Created set:', sets.cat4.name);

  sets.cat5 = await post('/api/topics/' + topic.id + '/sets', {
    name: '5. Data Center Specific',
    description: '6 cards — Redundancy tiers (N/N+1/2N), STS placement, UPS bypass, dual-corded loads, generator connections.'
  });
  console.log('Created set:', sets.cat5.name);

  // Import cards
  const allSets = [
    { cards: cat1, setId: sets.cat1.id },
    { cards: cat2, setId: sets.cat2.id },
    { cards: cat3, setId: sets.cat3.id },
    { cards: cat4, setId: sets.cat4.id },
    { cards: cat5, setId: sets.cat5.id }
  ];

  let total = 0;
  for (const { cards, setId } of allSets) {
    for (const c of cards) {
      await post('/api/sets/' + setId + '/cards', {
        tags: c.tags,
        front: { media_blocks: [{ block_type: 'text', text_content: c.front }] },
        back: { media_blocks: [{ block_type: 'text', text_content: c.back }] }
      });
      total++;
    }
    console.log('  Imported', cards.length, 'cards into set (' + total + ' total)');
  }

  console.log('\nDone! Created', total, 'flashcards across 5 sets in topic "Single-Line Diagrams (SLD)"');
}

main().catch(e => console.error('Error:', e));
