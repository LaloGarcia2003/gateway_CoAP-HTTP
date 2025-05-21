const express = require('express');
const coap = require('coap');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Mapeo de métodos HTTP a CoAP
const methodMap = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete'
};

// Mapeo de códigos de estado CoAP a HTTP
const statusMap = {
  '2.01': 201, // Created
  '2.02': 200, // Deleted
  '2.03': 200, // Valid
  '2.04': 200, // Changed
  '2.05': 200, // Content
  '4.00': 400, // Bad Request
  '4.01': 401, // Unauthorized
  '4.02': 402, // Bad Option
  '4.04': 404, // Not Found
  '4.05': 405, // Method Not Allowed
  '5.00': 500  // Internal Server Error
};

// Función para hacer peticiones CoAP
async function makeCoapRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const req = coap.request({
      hostname: 'localhost',
      port: 5683,
      pathname: path,
      method: method.toUpperCase(),
      options: {
        'Content-Format': 'application/json'
      }
    });

    const timeout = setTimeout(() => {
      req.abort();
      reject(new Error('CoAP request timeout'));
    }, 5000);

    req.on('response', (res) => {
      clearTimeout(timeout);
      let payload = '';

      res.on('data', (chunk) => {
        payload += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            statusCode: statusMap[res.code] || 500,
            body: payload ? JSON.parse(payload) : null
          };
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Manejador para todas las rutas HTTP
app.all('*', async (req, res) => {
  try {
    const method = methodMap[req.method];
    if (!method) {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const coapResponse = await makeCoapRequest(req.method, req.path, req.body);
    res.status(coapResponse.statusCode).json(coapResponse.body);

  } catch (err) {
    console.error('Gateway error:', err);
    res.status(500).json({ 
      error: 'Gateway Error', 
      message: err.message 
    });
  }
});

// Iniciar servidor HTTP
app.listen(3000, () => {
  console.log('HTTP-CoAP Gateway listening on port 3000');
  console.log('Proxy all requests to CoAP server on port 5683');
});