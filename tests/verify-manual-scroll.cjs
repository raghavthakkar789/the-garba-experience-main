/* Browser regression: bounded continuous manual scrolling with reading-area slowdowns. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
let browser,server;
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 server=http.createServer((q,s)=>{try{const file=path.join(root,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);s.end(fs.readFileSync(file));}catch{s.writeHead(404);s.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#invitation-seal').click();await page.waitForFunction(()=>!document.querySelector('#invitation').dataset.entering&&scrollY>0,{},{timeout:7000});
 async function wheel(delta){await page.mouse.move(180,500);await page.mouse.wheel(0,delta);}
 async function place(y){await page.evaluate(y=>{const el=document.scrollingElement||document.documentElement;el.scrollTop=y;},y);await page.waitForTimeout(80);}
 const stops=await page.evaluate(()=>{const scenes=[...document.querySelectorAll('.scene')],journey=document.querySelector('.journey'),stage=document.querySelector('.journey-stage'),spans=scenes.map(s=>Number(s.dataset.scrollSpan)||1),total=spans.reduce((a,b)=>a+b,0),travel=journey.offsetHeight-stage.clientHeight,top=journey.getBoundingClientRect().top+scrollY;let start=0;const out=[];for(let i=0;i<scenes.length;i++){for(const line of scenes[i].querySelectorAll('.dialogue-beat')){const beat=Number(line.dataset.at)||0,local=scenes[i].id==='beginning'&&beat===0?.42:Math.max(.06,beat+.015);out.push(top+(start+local*spans[i])/total*travel);}start+=spans[i];}return out;});
 const zone=stops[3];

 // Gentle normal-area wheel remains responsive.
 await place(zone-600);const gentleStart=await page.evaluate(()=>scrollY);await wheel(120);await page.waitForTimeout(450);const gentle=await page.evaluate(y=>scrollY-y,gentleStart);
 assert(gentle>90,'gentle wheel should move responsively');

 // Aggressive input is bounded: no single gesture can sweep the whole story.
 await place(zone-700);const hardStart=await page.evaluate(()=>scrollY);await wheel(20000);await page.waitForTimeout(250);const early=await page.evaluate(y=>scrollY-y,hardStart);
 assert(early<500,'aggressive wheel velocity stays bounded');
 await page.waitForTimeout(1400);const hardTotal=await page.evaluate(y=>scrollY-y,hardStart);
 assert(hardTotal<=705,'queued movement stays within the 700px budget');

 // Same gesture crosses the reading area continuously: it slows, but never locks/snaps.
 await place(zone-220);const throughStart=await page.evaluate(()=>scrollY);await wheel(700);await page.waitForTimeout(1800);const throughEnd=await page.evaluate(()=>scrollY);
 assert(throughEnd>zone+5,'continuous gesture passes through dialogue without a fresh gesture');
 assert(throughEnd-throughStart<700,'slow area reduces effective queued movement');

 // Reverse scrolling uses the same slowdown and remains continuous.
 await place(zone+220);await wheel(-700);await page.waitForTimeout(1800);const reverseEnd=await page.evaluate(()=>scrollY);
 assert(reverseEnd<zone-5,'reverse gesture passes through reading area continuously');

 // Compare speed around a reading-area center with speed away from it.
 async function measureStep(y){await place(y);const start=await page.evaluate(()=>scrollY);await wheel(220);await page.waitForTimeout(260);return Math.abs(await page.evaluate(s=>scrollY-s,start));}
 const normalStep=await measureStep(zone-500),slowStep=await measureStep(zone);
 assert(normalStep>slowStep*1.8,'reading-area center is substantially slower than normal scrolling');

 // Keyboard navigation is bounded and continuous.
 await place(zone-300);const keyStart=await page.evaluate(()=>scrollY);for(let i=0;i<8;i++)await page.keyboard.press('ArrowDown');await page.waitForTimeout(900);
 const keyEnd=await page.evaluate(()=>scrollY);
 assert(keyEnd>keyStart,'keyboard navigation advances');
 assert(keyEnd-keyStart<=705,'keyboard queue remains bounded');

 // Trackpad-like continuous wheel stream does not require input restart at the reading area.
 await place(zone-260);for(let i=0;i<16;i++){await wheel(55);await page.waitForTimeout(35);}await page.waitForTimeout(1000);
 assert(await page.evaluate(z=>scrollY>z+5,zone),'continuous wheel stream crosses slowdown center');

 // Touch: one uninterrupted swipe crosses the reading area when JS owns vertical scrolling.
 const session=await page.context().newCDPSession(page);await place(zone-260);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:700}]});
 for(const y of [640,580,520,460,400,340,280,220,160]){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y}]});await page.waitForTimeout(35);}
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);
 assert(await page.evaluate(z=>scrollY>z+5,zone),'single uninterrupted touch swipe crosses reading area');

 // Horizontal gesture is not hijacked.
 const horizontalPrevented=await page.evaluate(()=>{let prevented=false;const h=e=>prevented=e.defaultPrevented;addEventListener('wheel',h,{once:true});dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:100,deltaY:20}));return prevented;});
 assert.equal(horizontalPrevented,false,'horizontal wheel gesture remains native');

 // Dialog scrolling and pinch/zoom remain native.
 await page.evaluate(()=>document.querySelector('#original-invitation-dialog').showModal());
 const dialogNative=await page.locator('#original-invitation-dialog').evaluate(d=>d.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:500})));
 assert(dialogNative,'dialog wheel remains native');await page.keyboard.press('Escape');
 const zoomNative=await page.evaluate(()=>document.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:100})));
 assert(zoomNative,'pinch/zoom remains available');

 // Manual interaction interrupts Autoscroll without changing its feature.
 await page.locator('#autoscroll-toggle').click();assert.equal(await page.locator('#autoscroll-toggle').getAttribute('aria-pressed'),'true');
 await wheel(30);await page.waitForTimeout(100);assert.equal(await page.locator('#autoscroll-toggle').getAttribute('aria-pressed'),'false');

 // Reduced motion uses bounded immediate movement, still without locks.
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(160);const reducedStart=await page.evaluate(()=>scrollY);await wheel(500);await page.waitForTimeout(80);
 const reducedEnd=await page.evaluate(()=>scrollY);assert(reducedEnd!==reducedStart,'reduced motion manual input moves immediately');
 assert(Math.abs(reducedEnd-reducedStart)<=705,'reduced motion movement remains bounded');

 assert.deepEqual(errors,[]);
 console.log('PASS: bounded wheel/trackpad/touch/keyboard scrolling, continuous bidirectional reading slowdowns, no mandatory stops, native dialogs/horizontal/zoom, reduced motion, and Autoscroll takeover.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
