const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '../certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed SSL certificates for localhost...');

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'US' },
  { name: 'organizationName', value: 'DevCorp' }
];

async function generate() {
  try {
    // selfsigned.generate is async and returns a promise in modern versions
    const pems = await selfsigned.generate(attrs, { days: 365 });
    
    fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private);
    fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert);
    
    console.log('✅ Local SSL certificates generated successfully in:');
    console.log(`🔑 Private Key: ${path.join(certsDir, 'key.pem')}`);
    console.log(`📜 Certificate: ${path.join(certsDir, 'cert.pem')}`);
  } catch (err) {
    console.error('❌ Failed to generate certificates:', err);
    process.exit(1);
  }
}

generate();
