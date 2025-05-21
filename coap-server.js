const coap = require('coap');
const server = coap.createServer();

// Almacén de datos simple para pruebas
let dataStore = {
  test: { message: 'Hello from CoAP server!' },
  data: { items: [1, 2, 3], timestamp: Date.now() }
};

// Manejo de peticiones
server.on('request', (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;
  let payload = '';

  req.on('data', (chunk) => {
    payload += chunk;
  });

  req.on('end', () => {
    try {
      console.log(`CoAP Server: ${method} ${url}`);
      
      let responseData;
      let statusCode = '2.05'; // Content por defecto

      switch (method) {
        case 'GET':
          if (dataStore[url.substring(1)]) {
            responseData = dataStore[url.substring(1)];
          } else {
            statusCode = '4.04';
            responseData = { error: 'Not Found' };
          }
          break;

        case 'POST':
        case 'PUT':
          if (payload) {
            const newData = JSON.parse(payload);
            const resource = url.substring(1);
            dataStore[resource] = newData;
            statusCode = method === 'POST' ? '2.01' : '2.04'; // Created o Changed
            responseData = { status: 'success', data: newData };
          } else {
            statusCode = '4.00';
            responseData = { error: 'Bad Request' };
          }
          break;

        case 'DELETE':
          if (dataStore[url.substring(1)]) {
            delete dataStore[url.substring(1)];
            responseData = { status: 'deleted' };
          } else {
            statusCode = '4.04';
            responseData = { error: 'Not Found' };
          }
          break;

        default:
          statusCode = '4.05';
          responseData = { error: 'Method Not Allowed' };
      }

      res.code = statusCode;
      res.setOption('Content-Format', 'application/json');
      res.end(JSON.stringify(responseData));

    } catch (err) {
      console.error('Error processing request:', err);
      res.code = '5.00';
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });
});

// Manejo de errores
server.on('error', (err) => {
  console.error('CoAP Server error:', err);
});

// Iniciar servidor
server.listen(5683, () => {
  console.log('CoAP server listening on port 5683');
  console.log('Available resources: /test, /data');
});