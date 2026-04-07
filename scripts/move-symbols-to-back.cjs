const http = require('http');

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

const cardIds = [
  '9fcd06ce013d49b8', 'd9a4018c76c64faa', '44bd8ab85a724437', 'a54ab563cdb74fc3',
  'ac8c0c74679b422e', 'd57999ac0ab547de', '2aa9d764ede24c12', 'b4125ad939844030',
  '2fcc80e2267f4b3b', '9ab50357475848c9', '1c42924651754db3', '87292955d7ed4ba7',
  '9b40a39c1479496a', '18f038f9c36148b3', '1de2c3c6aa9a4ab5', '596d9934f9904c25',
  '03d4f6aaddfc4932', '4d75d6bcd112496c', '950597457e5e4ab9', 'a3613f515ec94a05'
];

async function main() {
  let moved = 0;
  for (const id of cardIds) {
    const card = await get(`/api/cards/${id}`);

    // Find the image block on the front
    const frontBlocks = card.front.media_blocks;
    const imgBlock = frontBlocks.find(b => b.block_type === 'image');
    if (!imgBlock) { console.log('No image on front for', id); continue; }

    // Front: text only (remove image)
    const frontTextBlocks = frontBlocks
      .filter(b => b.block_type === 'text')
      .map(b => ({ block_type: 'text', text_content: b.text_content }));

    // Back: image first, then existing text
    const backTextBlocks = card.back.media_blocks.map(b => ({
      block_type: b.block_type,
      text_content: b.text_content || null,
      file_path: b.file_path || null,
      file_name: b.file_name || null,
      file_size: b.file_size || null,
      mime_type: b.mime_type || null
    }));

    const newBackBlocks = [
      {
        block_type: 'image',
        file_path: imgBlock.file_path,
        file_name: imgBlock.file_name,
        file_size: imgBlock.file_size,
        mime_type: imgBlock.mime_type
      },
      ...backTextBlocks
    ];

    await put(`/api/cards/${id}`, {
      tags: card.tags ? (typeof card.tags === 'string' ? JSON.parse(card.tags) : card.tags) : [],
      front: { media_blocks: frontTextBlocks },
      back: { media_blocks: newBackBlocks }
    });
    moved++;
  }
  console.log(`Moved ${moved} symbol images from front → back (answer side).`);
}

main().catch(e => console.error('Error:', e));
