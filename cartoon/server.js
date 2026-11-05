const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=__dirname, TL=process.env.TL||path.join(__dirname,'timeline.json');
const types={'.js':'text/javascript','.html':'text/html','.json':'application/json','.mjs':'text/javascript'};
function start(port){return new Promise(res=>{const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f;
 if(u==='/')u='/index.html'; if(u==='/timeline.json')f=TL; else if(u.startsWith('/node_modules/'))f=path.join(ROOT,u); else f=path.join(ROOT,'page',u);
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(port,()=>res(s));});}
module.exports={start};
