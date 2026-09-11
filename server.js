const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const ML_TOKEN = process.env.ML_ACCESS_TOKEN || '';
const PUBLIC = path.resolve(__dirname, '..', 'public');

function parseBudget(text) {
  const m = String(text).replace(/\./g,'').match(/(?:até|ate|no máximo|max(?:imo)?|menos de)\s*r?\$?\s*([\d]+(?:,[\d]{1,2})?)/i);
  return m ? Number(m[1].replace(',','.')) : null;
}
function parseIntent(text){
  const q=String(text).trim();
  const budget=parseBudget(q);
  const clean=q.replace(/(?:até|ate|no máximo|max(?:imo)?|menos de)\s*r?\$?\s*[\d]+(?:,[\d]{1,2})?/i,'').replace(/\s+/g,' ').trim();
  return {query: clean || q, budget};
}

function demoProducts(query){
  const q=query.toLowerCase();
  const sets = q.includes('fone') || q.includes('headset') ? [
    {id:'demo-1',name:'Fone Bluetooth Pro',price:149.9,oldPrice:219.9,rating:4.7,store:'Demonstração',url:'#',emoji:'🎧'},
    {id:'demo-2',name:'Headphone ANC',price:229.9,oldPrice:299.9,rating:4.6,store:'Demonstração',url:'#',emoji:'🎧'},
    {id:'demo-3',name:'Fone TWS Esportivo',price:99.9,oldPrice:139.9,rating:4.5,store:'Demonstração',url:'#',emoji:'🎵'}
  ] : q.includes('celular') || q.includes('smartphone') ? [
    {id:'demo-4',name:'Samsung Galaxy A55 5G',price:1199,oldPrice:1499,rating:4.7,store:'Demonstração',url:'#',emoji:'📱'},
    {id:'demo-5',name:'POCO X6 5G',price:1399,oldPrice:1699,rating:4.6,store:'Demonstração',url:'#',emoji:'📱'},
    {id:'demo-6',name:'Realme C67',price:899,oldPrice:1099,rating:4.5,store:'Demonstração',url:'#',emoji:'📱'}
  ] : [
    {id:'demo-7',name:'Produto destaque',price:149.9,oldPrice:199.9,rating:4.6,store:'Demonstração',url:'#',emoji:'🛍️'},
    {id:'demo-8',name:'Oferta custo-benefício',price:219.9,oldPrice:279.9,rating:4.5,store:'Demonstração',url:'#',emoji:'🔥'},
    {id:'demo-9',name:'Alternativa econômica',price:99.9,oldPrice:129.9,rating:4.4,store:'Demonstração',url:'#',emoji:'💰'}
  ];
  return sets;
}

async function mercadoLivreSearch(query){
  if(!ML_TOKEN) return null;
  const endpoint='https://api.mercadolibre.com/sites/MLB/search?q='+encodeURIComponent(query)+'&limit=30';
  const r=await fetch(endpoint,{headers:{Authorization:'Bearer '+ML_TOKEN}});
  if(!r.ok) throw new Error('Mercado Livre API: '+r.status);
  const data=await r.json();
  return (data.results||[]).map(x=>({
    id:x.id,name:x.title,price:Number(x.price),oldPrice:x.original_price?Number(x.original_price):null,
    rating:null,store:'Mercado Livre',url:x.permalink,thumbnail:x.thumbnail,emoji:'🛍️'
  }));
}

function rank(products,budget){
  return products.map(p=>{
    const discount=p.oldPrice && p.oldPrice>p.price ? Math.round((1-p.price/p.oldPrice)*100) : 0;
    const budgetScore=budget==null?0:(p.price<=budget?40:-Math.min(30,(p.price-budget)/Math.max(budget,1)*30));
    const discountScore=discount*0.6;
    const ratingScore=(p.rating||0)*8;
    const priceScore=Math.max(0,12-p.price/300);
    return {...p,discount,score:budgetScore+discountScore+ratingScore+priceScore};
  }).sort((a,b)=>b.score-a.score).slice(0,15);
}

function aiSummary(query,budget,products){
  if(!products.length) return 'Não encontrei ofertas nesta busca. Tente mudar os termos.';
  const under=budget!=null ? products.filter(p=>p.price<=budget).length : 0;
  if(budget!=null && under) return `Encontrei ${products.length} opções e destaquei ${under} dentro do seu limite de R$ ${budget.toLocaleString('pt-BR',{minimumFractionDigits:2})}. Compare preço e condições antes de comprar.`;
  return `Encontrei ${products.length} opções. A lista prioriza custo-benefício, desconto e aderência à sua busca.`;
}

async function handleSearch(body){
  const raw=String(body.query||'').trim();
  if(!raw) throw Object.assign(new Error('Digite o que você procura.'),{status:400});
  const {query,budget}=parseIntent(raw);
  let products=null, source='demo';
  try{ products=await mercadoLivreSearch(query); if(products&&products.length) source='mercado_livre'; }catch(e){ console.error(e.message); }
  if(!products||!products.length) products=demoProducts(query);
  products=rank(products,budget);
  return {ok:true,query:raw,interpretedQuery:query,budget,source,products,ai:{summary:aiSummary(raw,budget,products)}};
}

function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function staticFile(req,res){
  let pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/') pathname='/index.html';
  const file=path.resolve(PUBLIC,'.'+pathname);
  if(!file.startsWith(PUBLIC+path.sep)) return res.writeHead(403).end();
  fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end('Not found');
    const ext=path.extname(file); const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});res.end(data);
  });
}

const server=http.createServer((req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
  if(req.method==='GET'&&req.url==='/api/health') return json(res,200,{ok:true,app:'AchouAI',version:'1.0.0',mercadoLivreConfigured:Boolean(ML_TOKEN)});
  if(req.method==='POST'&&req.url==='/api/search'){
    let raw=''; req.on('data',c=>{raw+=c;if(raw.length>20000) req.destroy();});
    req.on('end',async()=>{try{const result=await handleSearch(JSON.parse(raw||'{}'));json(res,200,result);}catch(e){json(res,e.status||500,{ok:false,error:e.message||'Erro inesperado'});}}); return;
  }
  staticFile(req,res);
});
server.listen(PORT,()=>console.log(`AchouAI 1.0.0 em http://localhost:${PORT}`));
