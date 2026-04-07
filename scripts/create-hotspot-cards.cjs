const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>{ try{resolve(JSON.parse(b))}catch(e){reject(new Error(b))} }); });
    req.on('error', reject); req.write(data); req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 3001, path }, res => {
      let b=''; res.on('data',c=>b+=c); res.on('end',()=>{ try{resolve(JSON.parse(b))}catch(e){reject(new Error(b))} });
    }).on('error', reject);
  });
}

async function main() {
  const topics = await get('/api/topics');
  const sld = topics.find(t => t.name.includes('SLD'));
  console.log('SLD topic:', sld.id);

  const diagSet = await post('/api/topics/' + sld.id + '/sets', {
    name: '6. Interactive Diagrams',
    description: 'Tap-to-explore diagrams with clickable hotspots. Tap numbered markers to learn about each component.'
  });
  console.log('Created set:', diagSet.id);

  // Card 1: Data Center Power Path
  const powerPathData = {
    image: 'sld-dc-power-path.svg',
    title: 'Data Center Power Path \u2014 Utility to Rack',
    spots: [
      { x: 11, y: 15, label: 'Utility Feed', text: '13.8 kV service from the electric utility. Typically dual feeds from separate substations for Tier III+. This is the point of common coupling (PCC) where utility responsibility ends.' },
      { x: 30, y: 15, label: 'MV Switchgear', text: '15 kV class metal-clad switchgear per IEEE C37.20.2. Contains drawout vacuum or SF6 circuit breakers, protective relays (50/51, 87), CTs and PTs. Main distribution point for medium voltage.' },
      { x: 45, y: 15, label: 'Step-Down Xfmr', text: '13.8 kV to 480/277V. Delta-wye (\u0394-Y) configuration provides neutral for the 480V system. Typical ratings: 1,500-2,500 kVA. Impedance (%Z) of 5.75% limits fault current on secondary.' },
      { x: 61, y: 15, label: 'LV Switchgear', text: '480V main switchgear or switchboard. Contains main breaker, distribution breakers, metering CTs, and ground fault protection. Rated 65-100 kAIC for available fault current.' },
      { x: 61, y: 33, label: 'ATS', text: 'Automatic Transfer Switch. Transfers load between Normal (utility) and Emergency (generator) sources. Transfer time: 10-30 seconds (open transition) or 100ms (closed transition).' },
      { x: 80, y: 33, label: 'Generator', text: 'Diesel standby generator. Starts on utility failure, stabilizes in 10 seconds, ATS transfers load. Sized for full critical load. Fuel: diesel or HVO. Runtime: 24-72 hours on-site fuel.' },
      { x: 61, y: 49, label: 'UPS', text: 'Uninterruptible Power Supply. Online double-conversion: Rectifier (AC\u2192DC) \u2192 Battery (DC storage) \u2192 Inverter (DC\u2192AC). Li-ion batteries provide 5-15 minutes of ride-through. Bridges utility loss to generator start.' },
      { x: 61, y: 64, label: 'STS', text: 'Static Transfer Switch. Solid-state (SCR-based) switch between two UPS sources. Transfers in < 4 milliseconds (sub-cycle). Provides 2N-like protection for single-corded IT equipment.' },
      { x: 61, y: 78, label: 'PDU', text: 'Power Distribution Unit. Steps down 480V to 208/120V via internal transformer. Contains 42-pole panelboard with branch circuit breakers. Distributes power to individual rack circuits.' },
      { x: 61, y: 95, label: 'IT Racks', text: '208/120V power to servers via rack-mount PDU strips. Dual-corded equipment connects to A and B paths for 2N redundancy. Typical: 5-20 kW/rack (up to 100 kW for AI/GPU).' }
    ]
  };

  await post('/api/sets/' + diagSet.id + '/cards', {
    tags: ['interactive', 'diagram', 'power-path', 'data-center'],
    front: { media_blocks: [
      { block_type: 'text', text_content: 'Explore: Data Center Power Path\n\nTap each numbered marker to learn what each component does, from utility service entrance to server rack.' }
    ]},
    back: { media_blocks: [
      { block_type: 'hotspot', text_content: JSON.stringify(powerPathData), file_path: 'sld-dc-power-path.svg', file_name: 'sld-dc-power-path.svg', file_size: 5000, mime_type: 'image/svg+xml' }
    ]}
  });
  console.log('Created: DC Power Path hotspot card');

  // Card 2: Substation Components (reuses the diagram with different hotspots)
  const substationData = {
    image: 'sld-dc-power-path.svg',
    title: 'Electrical Substation \u2014 Key Components',
    spots: [
      { x: 11, y: 15, label: 'Utility Transmission', text: 'High-voltage transmission lines (69-765 kV) deliver bulk power from generating stations. Enters substation via steel lattice towers or underground cables at the point of delivery.' },
      { x: 30, y: 15, label: 'HV Breaker', text: 'SF6 or oil circuit breaker rated to interrupt fault currents up to 63 kA. ANSI device 52. Combined with protective relays (50/51/87) for automatic fault isolation.' },
      { x: 45, y: 15, label: 'Power Transformer', text: 'Steps voltage from transmission (138 kV) to distribution (13.8 kV). Oil-filled, ONAN/ONAF cooling. Rated 10-100+ MVA. Equipped with OLTC for voltage regulation under load.' },
      { x: 61, y: 15, label: 'Distribution Bus', text: 'Aluminum or copper bus conducting power to distribution feeders. Configuration determines reliability: single bus (simplest), ring bus, breaker-and-a-half (best). Protected by bus differential relay (87B).' },
      { x: 80, y: 33, label: 'Surge Arrester', text: 'Metal-oxide (ZnO) arrester near transformer bushings. High impedance at normal voltage, low impedance during surges. Diverts surge current to ground, clamping voltage to safe levels.' },
      { x: 30, y: 49, label: 'CT / PT', text: 'Current Transformers (ratio to 5A) and Potential Transformers (step to 120V) provide scaled signals for metering, SCADA, and protective relays. Accuracy: 0.3 for revenue metering, 5P20 for protection.' }
    ]
  };

  await post('/api/sets/' + diagSet.id + '/cards', {
    tags: ['interactive', 'diagram', 'substation'],
    front: { media_blocks: [
      { block_type: 'text', text_content: 'Explore: Electrical Substation Components\n\nTap each numbered marker to learn about the key components in a power substation.' }
    ]},
    back: { media_blocks: [
      { block_type: 'hotspot', text_content: JSON.stringify(substationData), file_path: 'sld-dc-power-path.svg', file_name: 'sld-dc-power-path.svg', file_size: 5000, mime_type: 'image/svg+xml' }
    ]}
  });
  console.log('Created: Substation Components hotspot card');

  console.log('\nDone! 2 interactive diagram cards created in SLD topic.');
}

main().catch(e => console.error(e));
