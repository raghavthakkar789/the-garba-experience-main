/* Card-level regression: fit, reflow, containment and resizing without reloading. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
let server,browser;
(async()=>{
 const root=path.resolve(__dirname,'../dist'),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,name==='/'?'index.html':name);try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>document.fonts.ready);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function inspect(label,fitScreen=false){
  const data=await page.evaluate(()=>{
   const card=document.querySelector('.thank-you-details'),c=card.getBoundingClientRect(),issues=[];
   const frame=document.querySelector('.thank-you-frame'),f=frame.getBoundingClientRect();
   const left=c.left-f.left,right=f.right-c.right;
   if(Math.abs(left-right)>1)issues.push('card is not centered in its frame');
   if(Math.min(left,right)<19.5)issues.push('card touches decorative frame');
   const cap=parseFloat(getComputedStyle(frame.querySelector('.thank-you-arch')).borderImageWidth);
   if(c.top<f.top+cap)issues.push('card begins inside curved arch cap');
   for(const el of card.querySelectorAll('*')){
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    if(r.left<c.left-1||r.right>c.right+1||r.top<c.top-1||r.bottom>c.bottom+1)issues.push('outside card: '+(el.className.baseVal||el.className));
    for(const node of el.childNodes){if(node.nodeType!==Node.TEXT_NODE||!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const line of range.getClientRects()){if(line.left<c.left-1||line.right>c.right+1||line.bottom>c.bottom+1)issues.push('text outside card: '+node.textContent);}}
   }
   for(const el of card.querySelectorAll('a,button')){if(el.getBoundingClientRect().height<44)issues.push('small tap target');}
   const finale=document.querySelector('.finale.thank-you'),footer=document.querySelector('footer'),fr=finale.getBoundingClientRect(),fo=footer.getBoundingClientRect();
   const brands=document.querySelector('.finale-brands'),br=brands.getBoundingClientRect();
   if(innerWidth<=650&&br.height>innerHeight*.08)issues.push('final brand strip too tall on mobile');
   if(footer.textContent.includes('Original invitation'))issues.push('Original invitation still present in closing footer');
   for(const sel of ['.thank-you-elephant','.leaf-left','.leaf-right','.lotus-left','.lotus-right']){const el=document.querySelector(sel),r=el.getBoundingClientRect(),s=getComputedStyle(el);if(!r.width||!r.height||s.visibility==='hidden'||+s.opacity===0)issues.push('hidden closing art: '+sel);}

   if(Math.abs((fr.height+fo.height)-innerHeight)>2)issues.push('closing screen does not equal one viewport');
   if(c.bottom>fr.bottom+1)issues.push('details card clipped below final viewport');
   return {width:c.width,height:c.height,availableHeight:innerHeight-document.querySelector('.masthead').getBoundingClientRect().height-16,issues};
  });
  assert.deepEqual(data.issues,[],label);
  assert(data.width<=740.5,`${label}: card exceeds its desktop reading width`);
  if(fitScreen)assert(data.height<=data.availableHeight,`${label}: card ${data.height}px exceeds usable screen ${data.availableHeight}px`);
  console.log('PASS '+label+': '+Math.round(data.width)+'×'+Math.round(data.height));
 }
 for(const [width,height] of [[390,844],[320,800],[430,932],[360,740],[320,568],[280,640],[650,900],[651,900],[844,390],[1024,768],[1440,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(80);await inspect(width+'x'+height,height>=740&&width<=430);
  if(process.env.SCREENSHOT_DIR&&[320,390,1440].includes(width)){
   fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.locator('.thank-you-details').screenshot({path:path.join(process.env.SCREENSHOT_DIR,`card-${width}-${height}.png`),style:'.masthead,.skip-link,.progress-line{visibility:hidden!important}'});
  }
 }
 await page.setViewportSize({width:1440,height:900});
 for(const width of [240,280,320,480,740]){await page.locator('.thank-you-details').evaluate((el,w)=>{el.style.width=w+'px';},width);await inspect('card constrained to '+width+'px in desktop viewport');}
 await page.locator('.thank-you-details').evaluate(el=>el.style.removeProperty('width'));
 await page.setViewportSize({width:320,height:640});
 await page.evaluate(()=>{const list=[...document.querySelectorAll('.thank-you-details *')].filter(el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);for(const [el,size] of list)el.style.fontSize=size*2+'px';});
 await inspect('320px / 200% text');assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
