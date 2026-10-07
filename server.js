const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function read(f){ 
  try{
    let filePath = path.join(__dirname, f);
    if(!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]');
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath,'utf8'))
  }catch(e){return []} 
}
function save(f,d){ 
  fs.writeFileSync(path.join(__dirname, f), JSON.stringify(d,null,2)) 
}

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
  
  let products = read('products.json');
  if(req.body.items){
    req.body.items.forEach(it=>{
      let prd = products.find(x=>x.id==it.id);
      if(prd) prd.stock -= it.qty;
    });
    save('products.json',products);
  }
  res.json({success:true, orderId:newOrder.id});
});
app.get('/api/orders', (req,res)=> res.json(read('orders.json')));

// --- FRONTEND ROUTES - AUTO FIXED ---
function sendOrFallback(res, file, fallback){
  let fp = path.join(__dirname, file);
  if(fs.existsSync(fp)) return res.sendFile(fp);
  return res.send(fallback);
}

const shopHTML = `<!DOCTYPE html><html><head><title>Mahabuba Cosmetics</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;text-align:center;padding:50px} .btn{padding:15px 30px;background:#e91e63;color:white;text-decoration:none;border-radius:10px;display:inline-block;margin:10px}</style></head><body><h1>💄 Mahabuba Cosmetics</h1><p>Tovuti iko LIVE!</p><a class="btn" href="/login">Ingia Dashboard</a><a class="btn" href="/api/products">Ona Bidhaa API</a></body></html>`;
const loginHTML = `<!DOCTYPE html><html><head><title>Login</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#fce4ec} .box{background:white;padding:30px;border-radius:15px;box-shadow:0 5px 20px rgba(0,0,0,0.1)} input{width:100%;padding:12px;margin:10px 0;border-radius:8px;border:1px solid #ccc} button{width:100%;padding:12px;background:#e91e63;color:white;border:none;border-radius:8px;cursor:pointer}</style></head><body><div class="box"><h2>Login - Mahabuba</h2><p>boss / 1234</p><input id="u" placeholder="username"><input id="p" type="password" placeholder="password"><button onclick="login()">Ingia</button><p id="msg"></p></div><script>async function login(){let r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u.value,password:p.value})});let d=await r.json();if(d.success){localStorage.setItem('role',d.role);location.href='/dashboard'}else{msg.innerText='Login failed'}}<\/script></body></html>`;
const dashHTML = `<!DOCTYPE html><html><head><title>Dashboard</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:20px} .card{border:1px solid #ddd;padding:15px;border-radius:10px;margin:10px 0}</style></head><body><h1>Dashboard - Mahabuba V5.1 PRO</h1><p id="role"></p><button onclick="location.href='/shop'">Shop</button> <button onclick="load()">Load Products</button><div id="prods"></div><script>role.innerText='Role: '+(localStorage.getItem('role')||'boss');async function load(){let r=await fetch('/api/products');let d=await r.json();prods.innerHTML=d.map(p=>'<div class=card>'+p.name+' - '+p.price+' TZS - Stock:'+p.stock+'</div>').join('')} load()<\/script></body></html>`;

app.get('/', (req,res)=> sendOrFallback(res,'shop.html', shopHTML));
app.get('/shop', (req,res)=> sendOrFallback(res,'shop.html', shopHTML));
app.get('/login', (req,res)=> sendOrFallback(res,'login.html', loginHTML));
app.get('/dashboard', (req,res)=> sendOrFallback(res,'dashboard.html', dashHTML));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LIVE - http://localhost:\${PORT}/login boss/1234`);
});
