const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper functions for reading/writing JSON asynchronously
async function readData(fileName) {
  const filePath = path.join(__dirname, fileName);
  try {
    if (!fsSync.existsSync(filePath)) {
      const defaultValue = fileName.includes('settings') ? '{}' : '[]';
      await fs.writeFile(filePath, defaultValue);
      return fileName.includes('settings') ? {} : [];
    }
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return fileName.includes('settings') ? {} : [];
  }
}

async function saveData(fileName, data) {
  const filePath = path.join(__dirname, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Authentication
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'boss' && password === '1234') {
    return res.json({ success: true, role: 'boss' });
  }
  const users = await readData('users.json');
  const user = users.find(x => x.username === username && x.password === password);
  if (user) {
    return res.json({ success: true, role: 'staff', user });
  }
  return res.json({ success: false });
});

// Products API
app.get('/api/products', async (req, res) => {
  res.json(await readData('products.json'));
});

app.post('/api/products', async (req, res) => {
  const products = await readData('products.json');
  const newProduct = {
    id: Date.now().toString(),
    name: req.body.name,
    price: req.body.price,
    buyingPrice: req.body.buyingPrice || 0,
    stock: req.body.stock,
    minStock: req.body.minStock || 5,
    barcode: req.body.barcode || '',
    image: req.body.image || '',
    createdAt: new Date().toISOString()
  };
  products.push(newProduct);
  await saveData('products.json', products);
  res.json({ success: true });
});

app.put('/api/products/:id', async (req, res) => {
  const products = await readData('products.json');
  const idx = products.findIndex(x => String(x.id) === String(req.params.id));
  if (idx === -1) return res.json({ success: false });
  products[idx] = { ...products[idx], ...req.body, id: req.params.id };
  await saveData('products.json', products);
  res.json({ success: true });
});

app.delete('/api/products/:id', async (req, res) => {
  const products = await readData('products.json');
  const filtered = products.filter(x => String(x.id) !== String(req.params.id));
  await saveData('products.json', filtered);
  res.json({ success: true });
});

// Orders API
app.get('/api/orders', async (req, res) => {
  res.json(await readData('orders.json'));
});

app.post('/api/orders', async (req, res) => {
  const orders = await readData('orders.json');
  const newOrder = {
    id: Date.now().toString(),
    ...req.body,
    status: 'pending',
    date: new Date().toISOString()
  };
  orders.push(newOrder);
  await saveData('orders.json', orders);

  // Update stock
  const products = await readData('products.json');
  (req.body.items || []).forEach(item => {
    const p = products.find(prod => String(prod.id) === String(item.id));
    if (p) p.stock -= item.qty;
  });
  await saveData('products.json', products);

  res.json({ success: true, orderId: newOrder.id });
});

// Server Initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
