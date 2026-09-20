const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = "2YO3sjCGYrIfNcX_RaXx6QvcIgEWWp9ROGzyt1D9Q1QLbqBdMzei4xio3yi4CeWg";

const user = {
  sub: '66461153-f099-4d8f-b290-710d9f9903df',
  email: 'ahmed.benali@rendezvousapp.com',
  role: 'PROFESSIONNEL'
};

const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
console.log('Generated token');

const endpoints = [
  '/api/professionnel/moi',
  '/api/professionnel/services',
  '/api/professionnel/champs-personnalises',
  '/api/professionnel/disponibilites',
  '/api/professionnel/indisponibilites',
  '/api/professionnel/rendez-vous',
  '/api/professionnel/clients',
  '/api/professionnel/receptionnistes',
  '/api/professionnel/parametres',
  '/api/professionnel/historique',
  '/api/professionnel/stats',
  '/api/notifications',
];

function testEndpoint(path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${res.statusCode} ${path}`);
        if (res.statusCode >= 400) {
          console.error(`  ERROR BODY:`, data);
        }
        resolve({ path, status: res.statusCode, data });
      });
    });
    req.on('error', (err) => {
      console.error(`FAILED ${path}:`, err.message);
      resolve({ path, status: 0, error: err.message });
    });
    req.end();
  });
}

async function run() {
  for (const ep of endpoints) {
    await testEndpoint(ep);
  }
}

run();

