const fs = require('fs');
const http = require('http');
const path = require('path');

function post(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3001, path: urlPath, method: 'POST',
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

// Parse the JSX file to extract flashcards
const srcFile = process.env.SRCFILE || path.join('C:', 'Users', 'DMolin', 'Downloads', 'tia942-study-guide.jsx');
const content = fs.readFileSync(srcFile, 'utf8');

// Extract flashcards array content
const match = content.match(/const flashcards = \[([\s\S]*?)\];/);
if (!match) { console.error('No flashcards array found'); process.exit(1); }

// Parse individual card objects
const cardsRaw = match[1];
const cards = [];
const cardRegex = /\{\s*front:\s*"((?:[^"\\]|\\.)*)"\s*,\s*back:\s*"((?:[^"\\]|\\.)*)"\s*,\s*tags:\s*\[(.*?)\]/g;
let m;
while ((m = cardRegex.exec(cardsRaw)) !== null) {
  const front = m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  const back = m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  const tags = m[3].replace(/"/g, '').split(',').map(t => t.trim()).filter(Boolean);
  cards.push({ front, back, tags });
}

console.log(`Parsed ${cards.length} flashcards from JSX file`);

// Group by tag category for card sets
const tagToSet = {
  'overview': { name: '1. Overview & Fundamentals', desc: 'What is TIA-942, versions, terminology.' },
  'spaces': { name: '2. Data Center Spaces', desc: 'ER, MDA, IDA, HDA, ZDA, EDA, TR — functional space hierarchy.' },
  'topology': { name: '3. Cabling Topology', desc: 'Hierarchical star, cabling subsystems, cross-connects vs interconnections, topology variants.' },
  'cabling': { name: '4. Cabling & Media', desc: 'Cat 6/6A/8, OM3/OM4/OM5, LC/MPO connectors, distance limits, direct-attach rules.' },
  'infrastructure': { name: '5. Physical Infrastructure', desc: 'Floor loading, ceiling height, doors, cabinets, hot/cold aisle, access floors, lighting.' },
  'ratings': { name: '6. Data Center Ratings (1–4)', desc: 'Rated-1 Basic through Rated-4 Fault Tolerant, subsystem notation.' },
  'redundancy': { name: '7. Redundancy Concepts', desc: 'N, N+1, 2N, 2(N+1), concurrent maintainability, fault tolerance, separation rules.' },
  'energy': { name: '8. Energy Efficiency', desc: 'Overhead vs underfloor cabling, containment, cable routing, HVAC requirements.' },
  '942c': { name: '9. TIA-942-C Updates (2024)', desc: '800mm cabinets, normative ratings, immersion cooling annex, edge DCs, WAP cabling.' },
  'site': { name: '10. Site Selection', desc: 'Distance restrictions, building location, elevation limits.' }
};

async function main() {
  // Create topic
  const topic = await post('/api/topics', {
    name: 'TIA-942 — Data Center Standard',
    description: 'Telecommunications Infrastructure Standard for Data Centers. Covers cabling topology, functional spaces, physical infrastructure, ratings (1-4), redundancy, energy efficiency, and TIA-942-C (2024) updates.',
    color: '#7c3aed',
    icon: 'book'
  });
  console.log('Created topic:', topic.id, topic.name);

  // Create card sets and import cards
  const setMap = {};
  for (const [tag, info] of Object.entries(tagToSet)) {
    const cardSet = await post('/api/topics/' + topic.id + '/sets', { name: info.name, description: info.desc });
    setMap[tag] = cardSet.id;
    console.log('Created set:', info.name);
  }

  let total = 0;
  for (const card of cards) {
    // Use the first tag to determine which set
    const primaryTag = card.tags[0] || 'overview';
    const setId = setMap[primaryTag] || setMap['overview'];

    await post('/api/sets/' + setId + '/cards', {
      tags: card.tags,
      front: { media_blocks: [{ block_type: 'text', text_content: card.front }] },
      back: { media_blocks: [{ block_type: 'text', text_content: card.back }] }
    });
    total++;
    if (total % 10 === 0) console.log('  ...', total, '/', cards.length);
  }

  console.log(`\nDone! Created ${total} flashcards across ${Object.keys(setMap).length} sets in topic "TIA-942 — Data Center Standard"`);
}

main().catch(e => console.error('Error:', e));
