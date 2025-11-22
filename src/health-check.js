//src/health-check.js
const http = require('http');

const options = {
  host: 'localhost',
  port: 8080,
  timeout: 2000,
  path: '/',
};

const request = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`HEALTHCHECK: Status ${res.statusCode}`);
      console.log(`HEALTHCHECK: Hostname is ${json.hostname || 'not found'}`);

      if (res.statusCode === 200 && json.hostname) {
        process.exit(0); // everything is good
      } else {
        process.exit(1); // something missing
      }
    } catch (err) {
      console.error('HEALTHCHECK: Invalid JSON', err);
      process.exit(1);
    }
  });
});

request.on('error', (err) => {
  console.error('HEALTHCHECK: Error', err);
  process.exit(1);
});

request.end();
