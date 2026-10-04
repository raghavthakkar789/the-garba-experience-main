/* Browser regression: manual wheel/touch scrolling stays native after invitation unlock. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
let browser,server;
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 server=http.createServer((q,s)=>{try{const file=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);s.end(fs.readFileSync(file));}catch{s.writeHead(404);s.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#invitation-seal').click();await page.waitForFunction(()=>!document.querySelector('#invitation').dataset.entering&&scrollY>0,{},{timeout:7000});
 const start=await page.evaluate(()=>scrollY);
 await page.mouse.move(180,500);await page.mouse.wheel(0,500);await page.waitForTimeout(250);
 assert(await page.evaluate(y=>scrollY>y+20,start),'native wheel scroll advances the opened story');
 const wheelCancelable=await page.evaluate(()=>{let prevented=false;const h=e=>{prevented=e.defaultPrevented};addEventListener('wheel',h,{once:true});dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:80}));return prevented;});
 assert.equal(wheelCancelable,false,'story controller does not prevent normal wheel scrolling');
 await page.locator('#autoscroll-toggle').click();assert.equal(await page.locator('#autoscroll-toggle').getAttribute('aria-pressed'),'true');await page.mouse.wheel(0,30);await page.waitForTimeout(100);assert.equal(await page.locator('#autoscroll-toggle').getAttribute('aria-pressed'),'false','manual wheel takes over from autoscroll');
 await page.locator('.header-link').click();const exempt=await page.locator('#original-invitation-dialog').evaluate(d=>d.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:500})));assert(exempt,'dialog wheel remains native');await page.keyboard.press('Escape');
 const zoom=await page.evaluate(()=>document.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:100})));assert(zoom,'pinch/zoom remains available');
 assert.deepEqual(errors,[]);console.log('PASS: native manual wheel/touch path, autoscroll takeover, dialog scrolling and browser zoom.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
