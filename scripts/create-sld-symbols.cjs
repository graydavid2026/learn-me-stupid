const fs = require('fs');
const path = require('path');
const http = require('http');
const { randomUUID } = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'server', 'uploads');

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 3001, path: urlPath }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(new Error(buf)); } });
    }).on('error', reject);
  });
}

function put(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3001, path: urlPath, method: 'PUT',
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

// SVG helper: wrap content in standard SVG with dark background
function svg(w, h, content, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <style>
    text { font-family: 'Segoe UI', Arial, sans-serif; }
  </style>
  <rect width="${w}" height="${h}" rx="8" fill="#1a1a2e"/>
  ${content}
  <text x="${w/2}" y="${h-12}" text-anchor="middle" fill="#94a3b8" font-size="11">${label}</text>
</svg>`;
}

const symbols = {
  // 1.01 Power Transformer — two overlapping circles
  'power-transformer': svg(280, 180, `
    <line x1="60" y1="70" x2="110" y2="70" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="130" cy="70" r="28" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="160" cy="70" r="28" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="180" y1="70" x2="230" y2="70" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="100" y="115" fill="#e2e8f0" font-size="12">Pri</text>
    <text x="170" y="115" fill="#e2e8f0" font-size="12">Sec</text>
    <circle cx="130" cy="70" r="3" fill="#f59e0b"/>
    <circle cx="160" cy="70" r="3" fill="#f59e0b"/>
  `, 'Power Transformer'),

  // 1.02 Circuit Breaker — square with 52
  'circuit-breaker': svg(280, 180, `
    <line x1="140" y1="25" x2="140" y2="50" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="118" y="50" width="44" height="44" fill="none" stroke="#f59e0b" stroke-width="2.5" rx="2"/>
    <text x="140" y="78" text-anchor="middle" fill="#f59e0b" font-size="16" font-weight="bold">52</text>
    <line x1="140" y1="94" x2="140" y2="120" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="175" y="78" fill="#94a3b8" font-size="11">ANSI</text>
    <line x1="40" y1="78" x2="70" y2="78" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4,3"/>
    <text x="42" y="68" fill="#60a5fa" font-size="10">Trip</text>
    <path d="M70,78 L80,73 L80,83 Z" fill="#60a5fa"/>
    <line x1="80" y1="78" x2="118" y2="78" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4,3"/>
  `, 'Circuit Breaker'),

  // 1.03 Disconnect Switch — open knife blade
  'disconnect-switch': svg(280, 180, `
    <line x1="140" y1="25" x2="140" y2="65" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="140" cy="68" r="4" fill="#f59e0b"/>
    <line x1="140" y1="68" x2="170" y2="38" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="140" cy="95" r="4" fill="#f59e0b"/>
    <line x1="140" y1="95" x2="140" y2="130" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="185" y="60" fill="#94a3b8" font-size="11">Open position</text>
    <text x="185" y="75" fill="#94a3b8" font-size="11">(no fault interruption)</text>
  `, 'Disconnect Switch / Isolator'),

  // 1.04 Busbar — heavy horizontal line with taps
  'busbar': svg(320, 180, `
    <line x1="40" y1="65" x2="280" y2="65" stroke="#f59e0b" stroke-width="5"/>
    <line x1="80" y1="65" x2="80" y2="110" stroke="#f59e0b" stroke-width="2"/>
    <line x1="140" y1="65" x2="140" y2="110" stroke="#f59e0b" stroke-width="2"/>
    <line x1="200" y1="65" x2="200" y2="110" stroke="#f59e0b" stroke-width="2"/>
    <line x1="260" y1="65" x2="260" y2="110" stroke="#f59e0b" stroke-width="2"/>
    <text x="160" y="45" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="bold">BUS A — 480V</text>
    <text x="80" y="128" text-anchor="middle" fill="#94a3b8" font-size="10">Fdr 1</text>
    <text x="140" y="128" text-anchor="middle" fill="#94a3b8" font-size="10">Fdr 2</text>
    <text x="200" y="128" text-anchor="middle" fill="#94a3b8" font-size="10">Fdr 3</text>
    <text x="260" y="128" text-anchor="middle" fill="#94a3b8" font-size="10">Fdr 4</text>
  `, 'Busbar'),

  // 1.05 Generator — circle with G
  'generator': svg(280, 180, `
    <line x1="140" y1="25" x2="140" y2="42" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="140" cy="75" r="33" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="140" y="83" text-anchor="middle" fill="#f59e0b" font-size="28" font-weight="bold">G</text>
    <line x1="140" y1="108" x2="140" y2="130" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="195" y="78" fill="#94a3b8" font-size="11">Standby /</text>
    <text x="195" y="92" fill="#94a3b8" font-size="11">Emergency</text>
  `, 'Generator'),

  // 1.06 Current Transformer (CT) — donut around conductor
  'current-transformer': svg(280, 180, `
    <line x1="140" y1="20" x2="140" y2="130" stroke="#f59e0b" stroke-width="2.5"/>
    <path d="M120,65 A20,12 0 0,1 160,65" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <path d="M120,80 A20,12 0 0,0 160,80" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="160" y1="72" x2="210" y2="72" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="215" y="68" fill="#60a5fa" font-size="10">To relay /</text>
    <text x="215" y="80" fill="#60a5fa" font-size="10">meter (5A)</text>
  `, 'Current Transformer (CT)'),

  // 1.07 Potential Transformer (PT/VT) — small transformer
  'potential-transformer': svg(280, 180, `
    <line x1="90" y1="72" x2="118" y2="72" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="132" cy="72" r="16" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="156" cy="72" r="16" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="170" y1="72" x2="198" y2="72" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="95" y="55" fill="#e2e8f0" font-size="10">HV</text>
    <text x="185" y="55" fill="#e2e8f0" font-size="10">120V</text>
    <line x1="198" y1="72" x2="230" y2="72" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="202" y="92" fill="#60a5fa" font-size="10">To meter / relay</text>
    <text x="130" y="108" fill="#94a3b8" font-size="10">(Smaller than power xfmr)</text>
  `, 'Potential Transformer (PT/VT)'),

  // 1.08 Protective Relay — circle with ANSI number
  'protective-relay': svg(280, 180, `
    <circle cx="100" cy="72" r="24" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="100" y="78" text-anchor="middle" fill="#f59e0b" font-size="14" font-weight="bold">50/51</text>
    <circle cx="200" cy="72" r="24" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="200" y="78" text-anchor="middle" fill="#f59e0b" font-size="16" font-weight="bold">87</text>
    <line x1="124" y1="72" x2="176" y2="72" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="100" y="110" text-anchor="middle" fill="#94a3b8" font-size="10">Overcurrent</text>
    <text x="200" y="110" text-anchor="middle" fill="#94a3b8" font-size="10">Differential</text>
  `, 'Protective Relay'),

  // 1.09 Ground/Earth — stacked decreasing lines
  'ground': svg(280, 180, `
    <line x1="140" y1="25" x2="140" y2="55" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="105" y1="55" x2="175" y2="55" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="115" y1="68" x2="165" y2="68" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="125" y1="81" x2="155" y2="81" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="133" y1="94" x2="147" y2="94" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="190" y="75" fill="#94a3b8" font-size="11">Earth Ground</text>
  `, 'Ground / Earth Symbol'),

  // 1.10 Surge Arrestor — lightning bolt to ground
  'surge-arrestor': svg(280, 180, `
    <line x1="140" y1="20" x2="140" y2="40" stroke="#f59e0b" stroke-width="2.5"/>
    <polygon points="130,40 150,40 135,65 148,65 125,100 142,70 128,70" fill="#f59e0b"/>
    <line x1="115" y1="105" x2="165" y2="105" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="122" y1="113" x2="158" y2="113" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="129" y1="121" x2="151" y2="121" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="180" y="70" fill="#94a3b8" font-size="11">SA / LA</text>
  `, 'Surge Arrestor'),

  // 1.11 Capacitor Bank — parallel lines (one curved)
  'capacitor-bank': svg(280, 180, `
    <line x1="140" y1="20" x2="140" y2="55" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="110" y1="55" x2="170" y2="55" stroke="#f59e0b" stroke-width="2.5"/>
    <path d="M110,70 Q140,85 170,70" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="140" y1="75" x2="140" y2="110" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="185" y="65" fill="#94a3b8" font-size="11">Power Factor</text>
    <text x="185" y="78" fill="#94a3b8" font-size="11">Correction</text>
  `, 'Capacitor Bank'),

  // 1.12 Motor — circle with M
  'motor': svg(280, 180, `
    <line x1="140" y1="25" x2="140" y2="42" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="140" cy="75" r="33" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="140" y="84" text-anchor="middle" fill="#f59e0b" font-size="28" font-weight="bold">M</text>
    <text x="195" y="75" fill="#94a3b8" font-size="11">Fed from</text>
    <text x="195" y="88" fill="#94a3b8" font-size="11">MCC / VFD</text>
  `, 'Motor'),

  // 1.13 Fuse — S-curve on conductor
  'fuse': svg(280, 180, `
    <line x1="140" y1="20" x2="140" y2="45" stroke="#f59e0b" stroke-width="2.5"/>
    <path d="M140,45 C130,55 150,65 140,75 C130,85 150,95 140,105" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="140" y1="105" x2="140" y2="130" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="170" y="70" fill="#94a3b8" font-size="11">S-curve</text>
    <text x="170" y="83" fill="#94a3b8" font-size="11">style</text>
    <rect x="210" y="50" width="40" height="22" rx="2" fill="none" stroke="#f59e0b" stroke-width="2"/>
    <line x1="195" y1="61" x2="210" y2="61" stroke="#f59e0b" stroke-width="2"/>
    <line x1="250" y1="61" x2="265" y2="61" stroke="#f59e0b" stroke-width="2"/>
    <line x1="210" y1="61" x2="250" y2="61" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="230" y="90" text-anchor="middle" fill="#94a3b8" font-size="10">Alt. style</text>
  `, 'Fuse'),

  // 1.14 ATS — double-throw transfer switch
  'ats': svg(320, 200, `
    <text x="80" y="28" text-anchor="middle" fill="#e2e8f0" font-size="11">Normal</text>
    <text x="240" y="28" text-anchor="middle" fill="#e2e8f0" font-size="11">Emergency</text>
    <line x1="80" y1="35" x2="80" y2="65" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="240" y1="35" x2="240" y2="65" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="80" cy="68" r="4" fill="#f59e0b"/>
    <circle cx="240" cy="68" r="4" fill="#f59e0b"/>
    <circle cx="160" cy="100" r="4" fill="#f59e0b"/>
    <line x1="80" y1="68" x2="156" y2="100" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="240" y1="68" x2="164" y2="100" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5,4"/>
    <line x1="160" y1="104" x2="160" y2="140" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="160" y="158" text-anchor="middle" fill="#e2e8f0" font-size="11">To Load</text>
    <rect x="120" y="55" width="80" height="55" rx="4" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3"/>
    <text x="160" y="48" text-anchor="middle" fill="#94a3b8" font-size="10">ATS</text>
  `, 'Automatic Transfer Switch (ATS)'),

  // 1.15 UPS — block with sub-blocks
  'ups': svg(340, 200, `
    <line x1="170" y1="15" x2="170" y2="40" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="60" y="40" width="220" height="70" rx="4" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="170" y="35" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="bold">UPS</text>
    <line x1="153" y1="40" x2="153" y2="110" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,3"/>
    <line x1="220" y1="40" x2="220" y2="110" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="106" y="72" text-anchor="middle" fill="#e2e8f0" font-size="11">Rectifier</text>
    <text x="106" y="86" text-anchor="middle" fill="#e2e8f0" font-size="10">AC→DC</text>
    <text x="186" y="72" text-anchor="middle" fill="#e2e8f0" font-size="11">Battery</text>
    <text x="186" y="86" text-anchor="middle" fill="#e2e8f0" font-size="10">DC</text>
    <text x="254" y="72" text-anchor="middle" fill="#e2e8f0" font-size="11">Inverter</text>
    <text x="254" y="86" text-anchor="middle" fill="#e2e8f0" font-size="10">DC→AC</text>
    <line x1="170" y1="110" x2="170" y2="145" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="186" y1="95" x2="186" y2="130" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
    <rect x="172" y="130" width="28" height="18" rx="2" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="186" y="143" text-anchor="middle" fill="#94a3b8" font-size="8">BATT</text>
  `, 'UPS (Uninterruptible Power Supply)'),

  // 1.16 PDU/RPP — rectangle with branch taps
  'pdu-rpp': svg(320, 200, `
    <line x1="160" y1="15" x2="160" y2="40" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="80" y="40" width="160" height="85" rx="4" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="160" y="62" text-anchor="middle" fill="#f59e0b" font-size="14" font-weight="bold">PDU</text>
    <text x="160" y="78" text-anchor="middle" fill="#e2e8f0" font-size="10">480V → 208/120V</text>
    <line x1="100" y1="90" x2="220" y2="90" stroke="#f59e0b" stroke-width="2"/>
    <line x1="110" y1="90" x2="110" y2="125" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="140" y1="90" x2="140" y2="125" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="170" y1="90" x2="170" y2="125" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="200" y1="90" x2="200" y2="125" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="110" y="142" text-anchor="middle" fill="#94a3b8" font-size="9">Ckt 1</text>
    <text x="140" y="142" text-anchor="middle" fill="#94a3b8" font-size="9">Ckt 2</text>
    <text x="170" y="142" text-anchor="middle" fill="#94a3b8" font-size="9">Ckt 3</text>
    <text x="200" y="142" text-anchor="middle" fill="#94a3b8" font-size="9">Ckt 4</text>
    <text x="160" y="158" text-anchor="middle" fill="#94a3b8" font-size="10">→ To Rack PDUs</text>
  `, 'PDU / RPP'),

  // 1.17 Panelboard — rectangle with internal bus and ticks
  'panelboard': svg(300, 210, `
    <line x1="150" y1="10" x2="150" y2="35" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="80" y="35" width="140" height="120" rx="3" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="150" y="55" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="bold">PNL-1A</text>
    <text x="150" y="68" text-anchor="middle" fill="#e2e8f0" font-size="9">208/120V, 3Φ, 4W</text>
    <line x1="150" y1="78" x2="150" y2="145" stroke="#f59e0b" stroke-width="2"/>
    <line x1="135" y1="85" x2="150" y2="85" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="135" y1="95" x2="150" y2="95" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="135" y1="105" x2="150" y2="105" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="135" y1="115" x2="150" y2="115" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="135" y1="125" x2="150" y2="125" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="150" y1="85" x2="165" y2="85" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="150" y1="95" x2="165" y2="95" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="150" y1="105" x2="165" y2="105" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="150" y1="115" x2="165" y2="115" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="150" y1="125" x2="165" y2="125" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="120" y="90" text-anchor="end" fill="#94a3b8" font-size="8">1</text>
    <text x="120" y="100" text-anchor="end" fill="#94a3b8" font-size="8">3</text>
    <text x="120" y="110" text-anchor="end" fill="#94a3b8" font-size="8">5</text>
    <text x="180" y="90" fill="#94a3b8" font-size="8">2</text>
    <text x="180" y="100" fill="#94a3b8" font-size="8">4</text>
    <text x="180" y="110" fill="#94a3b8" font-size="8">6</text>
  `, 'Panelboard'),

  // 1.18 MCC — rectangle with motor starter buckets
  'mcc': svg(320, 220, `
    <line x1="160" y1="10" x2="160" y2="30" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="60" y="30" width="200" height="130" rx="3" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="160" y="52" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="bold">MCC-1</text>
    <line x1="160" y1="60" x2="160" y2="70" stroke="#f59e0b" stroke-width="2"/>
    <line x1="90" y1="70" x2="230" y2="70" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="78" y="80" width="42" height="60" rx="2" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <rect x="130" y="80" width="42" height="60" rx="2" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <rect x="182" y="80" width="42" height="60" rx="2" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="99" y1="70" x2="99" y2="80" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="151" y1="70" x2="151" y2="80" stroke="#f59e0b" stroke-width="1.5"/>
    <line x1="203" y1="70" x2="203" y2="80" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="99" y="100" text-anchor="middle" fill="#e2e8f0" font-size="9">Starter</text>
    <text x="151" y="100" text-anchor="middle" fill="#e2e8f0" font-size="9">Starter</text>
    <text x="203" y="100" text-anchor="middle" fill="#e2e8f0" font-size="9">Starter</text>
    <circle cx="99" cy="125" r="10" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="99" y="129" text-anchor="middle" fill="#f59e0b" font-size="10">M</text>
    <circle cx="151" cy="125" r="10" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="151" y="129" text-anchor="middle" fill="#f59e0b" font-size="10">M</text>
    <circle cx="203" cy="125" r="10" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="203" y="129" text-anchor="middle" fill="#f59e0b" font-size="10">M</text>
  `, 'Motor Control Center (MCC)'),

  // 1.19 STS — solid-state dual-feed switch
  'sts': svg(320, 200, `
    <text x="90" y="24" text-anchor="middle" fill="#e2e8f0" font-size="11">Source A</text>
    <text x="230" y="24" text-anchor="middle" fill="#e2e8f0" font-size="11">Source B</text>
    <line x1="90" y1="30" x2="90" y2="55" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="230" y1="30" x2="230" y2="55" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="55" y="55" width="210" height="55" rx="4" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="160" y="78" text-anchor="middle" fill="#f59e0b" font-size="14" font-weight="bold">STS</text>
    <text x="160" y="96" text-anchor="middle" fill="#e2e8f0" font-size="10">< 4ms transfer (solid-state)</text>
    <line x1="160" y1="110" x2="160" y2="145" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="160" y="160" text-anchor="middle" fill="#e2e8f0" font-size="11">To Load</text>
    <path d="M90,55 L90,65" stroke="#f59e0b" stroke-width="2"/>
    <path d="M230,55 L230,65" stroke="#f59e0b" stroke-width="2"/>
  `, 'Static Transfer Switch (STS)'),

  // 1.20 VFD — rectangle with rectifier/inverter blocks
  'vfd': svg(340, 200, `
    <line x1="170" y1="10" x2="170" y2="35" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="170" y="28" text-anchor="middle" fill="#e2e8f0" font-size="10">3Φ AC In</text>
    <rect x="60" y="35" width="220" height="75" rx="4" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="170" y="52" text-anchor="middle" fill="#f59e0b" font-size="13" font-weight="bold">VFD</text>
    <line x1="155" y1="58" x2="155" y2="110" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="107" y="78" text-anchor="middle" fill="#e2e8f0" font-size="11">Rectifier</text>
    <text x="107" y="92" text-anchor="middle" fill="#e2e8f0" font-size="10">AC→DC</text>
    <text x="215" y="78" text-anchor="middle" fill="#e2e8f0" font-size="11">Inverter</text>
    <text x="215" y="92" text-anchor="middle" fill="#e2e8f0" font-size="10">DC→Var AC</text>
    <line x1="170" y1="110" x2="170" y2="140" stroke="#f59e0b" stroke-width="2.5"/>
    <circle cx="170" cy="155" r="16" fill="none" stroke="#f59e0b" stroke-width="2"/>
    <text x="170" y="160" text-anchor="middle" fill="#f59e0b" font-size="14">M</text>
    <text x="200" y="140" fill="#94a3b8" font-size="10">Variable</text>
    <text x="200" y="152" fill="#94a3b8" font-size="10">Speed Out</text>
  `, 'Variable Frequency Drive (VFD)')
};

// Card IDs in order matching the symbols
const cardMap = [
  { id: '9fcd06ce013d49b8', key: 'power-transformer' },
  { id: 'd9a4018c76c64faa', key: 'circuit-breaker' },
  { id: '44bd8ab85a724437', key: 'disconnect-switch' },
  { id: 'a54ab563cdb74fc3', key: 'busbar' },
  { id: 'ac8c0c74679b422e', key: 'generator' },
  { id: 'd57999ac0ab547de', key: 'current-transformer' },
  { id: '2aa9d764ede24c12', key: 'potential-transformer' },
  { id: 'b4125ad939844030', key: 'protective-relay' },
  { id: '2fcc80e2267f4b3b', key: 'ground' },
  { id: '9ab50357475848c9', key: 'surge-arrestor' },
  { id: '1c42924651754db3', key: 'capacitor-bank' },
  { id: '87292955d7ed4ba7', key: 'motor' },
  { id: '9b40a39c1479496a', key: 'fuse' },
  { id: '18f038f9c36148b3', key: 'ats' },
  { id: '1de2c3c6aa9a4ab5', key: 'ups' },
  { id: '596d9934f9904c25', key: 'pdu-rpp' },
  { id: '03d4f6aaddfc4932', key: 'panelboard' },
  { id: '4d75d6bcd112496c', key: 'mcc' },
  { id: '950597457e5e4ab9', key: 'sts' },
  { id: 'a3613f515ec94a05', key: 'vfd' }
];

async function main() {
  let updated = 0;

  for (const { id, key } of cardMap) {
    const svgContent = symbols[key];
    if (!svgContent) { console.error('Missing SVG for', key); continue; }

    // Save SVG to uploads directory
    const fileName = `sld-${key}.svg`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, svgContent);

    // Get existing card data
    const card = await get(`/api/cards/${id}`);
    if (!card || !card.front) { console.error('Card not found:', id); continue; }

    // Build updated front with image + original text
    const existingText = card.front.media_blocks.find(b => b.block_type === 'text');
    const frontBlocks = [
      {
        block_type: 'text',
        text_content: existingText ? existingText.text_content : ''
      },
      {
        block_type: 'image',
        file_path: fileName,
        file_name: fileName,
        file_size: Buffer.byteLength(svgContent),
        mime_type: 'image/svg+xml'
      }
    ];

    // Keep back unchanged
    const backBlocks = card.back.media_blocks.map(b => ({
      block_type: b.block_type,
      text_content: b.text_content || null,
      file_path: b.file_path || null,
      file_name: b.file_name || null,
      file_size: b.file_size || null,
      mime_type: b.mime_type || null
    }));

    // Update card
    await put(`/api/cards/${id}`, {
      tags: card.tags ? (typeof card.tags === 'string' ? JSON.parse(card.tags) : card.tags) : [],
      front: { media_blocks: frontBlocks },
      back: { media_blocks: backBlocks }
    });

    updated++;
    console.log(`  [${updated}/20] ${key} ✓`);
  }

  console.log(`\nDone! Added symbol images to ${updated} cards.`);
}

main().catch(e => console.error('Error:', e));
