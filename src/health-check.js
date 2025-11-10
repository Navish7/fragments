const http = require('http');

const options = {
  host: 'localhost',
  port: 8080,
  timeout: 2000,
  path: '/',
};

const request = http.request(options, (res) => {
  console.log(`HEALTHCHECK: Status ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('HEALTHCHECK: Error', err);
  process.exit(1);
});

request.end();
