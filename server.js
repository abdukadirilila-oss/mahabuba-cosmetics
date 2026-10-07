const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));
app.use(express.static('public'));

function read(f){ try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return []} }
function save(f,d){ fs.writeFileSync(f, JSON.stringify(d,null,2)) }

// --- LOGIN ---
app.post('/api/login', (req,res)=>{
  if(req.body.username==='boss' && req.body.password==='1234'){
    return res.json({success:true, role:'boss'});
  }
  let users = read('users.json');
  let u = users.find(x=>x.username===req.body.username && x.password===req.body.password);
  if(u) return res.json({success:true, role:'staff', user:u});
  res.json({success:false});
});

// --- PRODUCTS ---
app.get('/api/products', (req,res)=> res.json(read('products.json')));
app.post('/api/products', (req,res)=>{
  let p = read('products.json');
  let newProd = {id:Date.now().toString(), name:req.body.name, price:req.body.price, buyingPrice:req.body.buyingPrice||0, stock:req.body.stock, minStock:req.body.minStock};
  p.push(newProd);
  save('products.json',p);
  res.json({success:true});
});
app.put('/api/products/:id', (req,res)=>{
  let p = read('products.json');
  let f = p.find(x=>x.id==req.params.id);
  if(!f) return res.json({success:false});
  f.name=req.body.name; f.price=req.body.price; f.buyingPrice=req.body.buyingPrice||0; f.stock=req.body.stock; f.minStock=req.body.minStock;
  save('products.json',p);
  res.json({success:true});
});
app.delete('/api/products/:id', (req,res)=>{
  let p = read('products.json').filter(x=>x.id!=req.params.id);
  save('products.json',p);
  res.json({success:true});
});

// --- USERS / WAFANYAKAZI ---
app.get('/api/users', (req,res)=> res.json(read('users.json')));
app.post('/api/users', (req,res)=>{
  let u = read('users.json');
  u.push({id:Date.now().toString(), name:req.body.name, username:req.body.username, password:req.body.password, phone:req.body.phone});
  save('users.json',u);
  res.json({success:true});
});
app.delete('/api/users/:id', (req,res)=>{
  let u = read('users.json').filter(x=>x.id!=req.params.id);
  save('users.json',u);
  res.json({success:true});
});

// --- ORDERS ---
app.post('/api/orders', (req,res)=>{
  let orders = read('orders.json');
  let newOrder = {
    id:Date.now().toString(),
    customerName:req.body.customerName,
    phone:req.body.phone,
    email:req.body.email||'',
    total:req.body.totalCost,
    status:'pending',
    items:req.body.items,
    date:new Date().toISOString()
  };
  orders.push(newOrder);
  save('orders.json',orders);
  
  // Punguza stock
  let products = read('products.json');
  req.body.items.forEach(it=>{
    let prd = products.find(x=>x.id==it.id);
    if(prd) prd.stock -= it.qty;
  });
  save('products.json',products);
  
  res.json({success:true, orderId:newOrder.id});
});

app.get('/api/orders', (req,res)=> res.json(read('orders.json')));

// --- FRONTEND ROUTES ---
app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'shop.html')));
app.get('/shop', (req,res)=> res.sendFile(path.join(__dirname,'shop.html')));
app.get('/login', (req,res)=> res.sendFile(path.join(__dirname,'login.html')));
app.get('/dashboard', (req,res)=> res.sendFile(path.join(__dirname,'dashboard.html')));

// --- MUHIMU KWA RENDER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`V5.1 PRO FIXED LIVE - Button ya Wafanyakazi Imerudi Juu - http://localhost:${PORT}/login boss/1234`);
});