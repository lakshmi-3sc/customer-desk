const http = require('http');

// Make request to API
const ticketId = 'cmob1q0a3000910owwc31u3fr';
const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/dashboard/similar-tickets?ticketId=${ticketId}`,
  method: 'GET',
  headers: {
    'Cookie': '' // No auth for now
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('API Response Status:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('\nParsed response:');
      console.log(JSON.stringify(json, null, 2));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
