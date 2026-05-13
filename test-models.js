const https = require('https');
https.get('https://openrouter.ai/api/v1/models', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const seedance = json.data.filter(m => m.id.includes('seedance') || m.id.includes('video'));
    console.log(seedance.map(m => m.id));
  });
});
