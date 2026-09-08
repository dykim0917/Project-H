const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../physics.js');
function seeded(seed=123){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function runWorld(w,seconds,firing=true){for(let i=0;i<Math.round(seconds/P.STEP);i++)w.step(P.STEP,firing);}
test('launch cadence is 100 per minute, stop drains all existing balls',()=>{
 const w=new P.World({random:seeded()});runWorld(w,60);assert.equal(w.shots,100);runWorld(w,25,false);assert.equal(w.shots,100);assert.equal(w.balls.length,0);assert.equal(w.hits+w.misses,100);
});
test('only crossing the visible mouth downwards records a hit',()=>{
 function trial(x,y,vy){const w=new P.World();w.balls=[{id:1,x,y,vx:0,vy,age:2,released:true}];const e=w.step();return e.filter(e=>e.type==='hit').length;}
 assert.equal(trial(268,573,300),1);assert.equal(trial(245,573,300),0);assert.equal(trial(268,575,-300),0);assert.equal(trial(191,527,300),0);
});
test('pin impact changes downward velocity and prevents penetration',()=>{
 const pin=P.pins[0],w=new P.World();w.balls=[{id:1,x:pin.x,y:pin.y-P.RADIUS-pin.r-0.1,vx:0,vy:100,age:1,released:true}];
 const events=w.step();assert.ok(w.balls[0].vy<0);assert.ok(events.some(e=>e.type==='bounce'));
});
test('guide rail is continuous, all shots conserved, wider mouth improves the seeded comparison',()=>{
 const results=[];
 for(const wide of [false,true]){const w=new P.World({wide,random:seeded()});let positions=new Map();
  for(let i=0;i<240*300;i++){w.step();if(i%144===0)w.launch();for(const b of w.balls){assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));const old=positions.get(b.id);if(old)assert.ok(Math.hypot(b.x-old[0],b.y-old[1])<14,'position discontinuity');positions.set(b.id,[b.x,b.y]);}}
  runWorld(w,25,false);assert.equal(w.shots,500);assert.equal(w.hits+w.misses,500);assert.equal(w.balls.length,0);results.push(w.hits);
 }
 assert.ok(results[0]>0&&results[1]>results[0]);
});
function harness(){
 const elements=new Map();const noop=()=>{};
 const context2d=new Proxy({createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 function el(){return{get textContent(){return this._text||'';},set textContent(value){this._text=String(value);this.children=[];},className:'',style:{setProperty(k,v){this[k]=v;}},setPointerCapture(){},focus(){},dataset:{},children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},replaceChildren(...x){this.children=x;for(const child of x)child.parentElement=this;},appendChild(x){this.children.push(x);x.parentElement=this;},prepend(x){this.children.unshift(x);},get lastChild(){return{remove:()=>this.children.pop()};},getContext:()=>context2d};}
 const ids=new Set([...fs.readFileSync(require.resolve('../index.html'),'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));const listeners={};let raf;
 const rng=seeded();const sandbox={PachinkoPhysics:P,crypto:{getRandomValues:a=>(a[0]=Math.floor(rng()*4294967296),a)},document:{hidden:false,getElementById:id=>{if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,el());return elements.get(id);},createElement:el,querySelectorAll:()=>[...elements.values()].flatMap(e=>e.children).filter(e=>e.className==='reel-track'),addEventListener:(type,fn)=>listeners[type]=fn},window:{addEventListener:(type,fn)=>listeners[type]=fn},requestAnimationFrame:f=>{raf=f;},console};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),sandbox);let time=0;
 return{sandbox,elements,listeners,read:expr=>vm.runInContext(expr,sandbox),async advance(seconds){for(let i=0;i<Math.ceil(seconds*60);i++){time+=1000/60;raf(time);await Promise.resolve();}},click:id=>elements.get(id).onclick()};
}
test('app receives physical hits, drains queue after firing stops, and keeps preview statistics isolated',async()=>{
 const h=harness();h.click('start');await h.advance(40);assert.ok(h.read('world.shots')>=65);assert.ok(h.read('world.hits')>0);assert.ok(h.read('active || spins>0'));
 h.click('start');const shots=h.read('world.shots');await h.advance(65);assert.equal(h.read('world.shots'),shots);assert.equal(h.read('world.balls.length'),0);assert.equal(h.read('queue.length'),0);assert.equal(h.read('active'),false);assert.ok(h.read('spins')>0);
 const before=h.read('JSON.stringify([spins,wins,paid,st,world.shots,world.hits])');h.read("tests.push('revive');pump()");await h.advance(25);assert.equal(h.read('preview'),false);assert.equal(h.read('JSON.stringify([spins,wins,paid,st,world.shots,world.hits])'),before);
});
test('overflow never exceeds four holds; switch clears in-flight spin without late payout',async()=>{
 const h=harness();h.read('for(let i=0;i<9;i++)reserve()');assert.equal(h.read('queue.length'),4);assert.equal(h.read('overflow'),5);
 h.read('pump()');h.read('reset(true)');await h.advance(25);assert.equal(h.read('world.wide'),true);assert.equal(h.read('spins+wins+paid+queue.length+overflow'),0);assert.equal(h.read('active'),false);
});
test('3x scales launch clock and hidden tab creates no catch-up shots',async()=>{
 const h=harness();h.click('speed');h.click('start');await h.advance(10);const shots=h.read('world.shots');assert.ok(shots>=49&&shots<=50);
 h.sandbox.document.hidden=true;await h.advance(10);assert.equal(h.read('world.shots'),shots);h.sandbox.document.hidden=false;await h.advance(1);assert.ok(h.read('world.shots')-shots<=5);
});

test('stage entrance is a physical crossing and stage OFF bypasses the channel',()=>{
 for(const enabled of [true,false]){
  const w=new P.World({stageEnabled:enabled});w.balls=[{id:1,x:P.stage.intake.x,y:P.stage.intake.y-1,vx:0,vy:300,age:2,released:true}];
  const events=w.step();assert.equal(w.stageEntries,enabled?1:0);assert.equal(events.some(e=>e.type==='stage-enter'),enabled);assert.equal(w.hits,0);
 }
});
test('stage momentum determines central or side exit without directly awarding admission',()=>{
 for(const [vx,expected] of [[120,'stage-center'],[290,'stage-side']]){
  const w=new P.World();w.balls=[{id:1,x:P.stage.left,y:P.stageY(P.stage.left)-P.RADIUS,vx,vy:0,age:2,released:true,route:'stage'}];let exit;
  for(let i=0;i<240*15&&!exit;i++){exit=w.step().find(e=>e.type===expected);assert.equal(w.hits,0);}
  assert.ok(exit,expected+' should occur');assert.equal(w.balls[0].route,'free');assert.ok(w.balls[0].fromStage);
 }
});
test('natural shots use both stage exits, all eventually drain, and toggle resets stage counts',async()=>{
 const w=new P.World({random:seeded()});runWorld(w,180);runWorld(w,30,false);
 assert.ok(w.stageEntries>0);assert.ok(w.stageCenters>0);assert.ok(w.stageSides>0);assert.equal(w.stageEntries,w.stageCenters+w.stageSides);assert.equal(w.balls.length,0);assert.equal(w.shots,w.hits+w.misses);
 const h=harness();h.click('start');await h.advance(25);assert.ok(h.read('world.stageEntries')>0);h.read('reset(world.wide,false)');assert.equal(h.read('world.stageEnabled'),false);assert.equal(h.read('world.stageEntries'),0);
});

test('free balls exchange momentum, including exactly overlapping centres',()=>{
 const w=new P.World();w.balls=[{id:1,x:340,y:150,vx:100,vy:0,age:2,released:true},{id:2,x:347,y:150,vx:-40,vy:0,age:2,released:true}];
 w.step();assert.ok(w.balls[0].vx<0);assert.ok(w.balls[1].vx>0);assert.ok(Math.abs(w.balls[0].vx+w.balls[1].vx-60)<1e-6);assert.equal(w.ballContacts,1);
 const q=new P.World();q.balls=[{id:1,x:340,y:150,vx:0,vy:0,age:2,released:true},{id:2,x:340,y:150,vx:0,vy:0,age:2,released:true}];q.step();assert.ok(Math.abs(q.balls[1].x-q.balls[0].x)>=2*P.RADIUS);
});
test('stage balls collide on the shelf instead of passing through',()=>{
 const w=new P.World();w.balls=[{id:1,x:220,y:P.stageY(220)-P.RADIUS,vx:100,vy:0,age:2,released:true,route:'stage'}, {id:2,x:227,y:P.stageY(227)-P.RADIUS,vx:-40,vy:0,age:2,released:true,route:'stage'}];
 const events=w.step();assert.ok(w.balls[0].vx<0);assert.ok(w.balls[1].vx>0);assert.ok(w.balls[1].x-w.balls[0].x>=2*P.RADIUS);assert.ok(events.some(e=>e.type==='ball-contact'));
});
test('same release point, different power: strong shots cross to right without granting jackpot admission',()=>{
 const results=[];
 for(const power of [.36,.9]){const w=new P.World({power,random:seeded()});runWorld(w,60);runWorld(w,30,false);assert.equal(w.shots,100);assert.equal(w.balls.length,0);assert.equal(w.shots,w.hits+w.misses);results.push(w);}
 assert.ok(results[0].stageEntries>0);assert.ok(results[1].rightExits>results[0].rightExits+60);assert.ok(results[1].hits<results[0].hits);
 const w=new P.World({power:.36,random:()=>.5});w.launch();const first=w.balls[0],vx=first.releaseVX;w.power=.9;w.launch();assert.equal(first.releaseVX,vx);assert.equal(first.power,.36);assert.ok(w.balls[1].releaseVX>vx);assert.deepEqual([first.x,first.y],[w.balls[1].x,w.balls[1].y]);
});
test('arrow tap, hold and keyboard affect future shots; release and zero stop correctly',async()=>{
 const h=harness();h.click('start');await h.advance(2);const before=h.read('world.shots'),vx=h.read('world.balls[0].releaseVX');
 const plus=h.elements.get('power-plus'),minus=h.elements.get('power-minus'),dial=h.elements.get('handle');
 const pointer={button:0,pointerId:1,preventDefault(){}};
 plus.onpointerdown(pointer);assert.equal(h.read('world.power'),.365);assert.equal(h.read('world.balls[0].releaseVX'),vx);
 plus.onpointerup(pointer);plus.onclick({detail:1});assert.equal(h.read('world.power'),.365);
 plus.onpointerdown(pointer);await h.advance(2);assert.ok(h.read('world.power')>.5);plus.onpointerup(pointer);const power=h.read('world.power');await h.advance(.5);assert.equal(h.read('world.power'),power);
 minus.onpointerdown(pointer);await h.advance(.6);assert.ok(h.read('world.power')<power);minus.onpointercancel(pointer);const cancelled=h.read('world.power');await h.advance(.5);assert.equal(h.read('world.power'),cancelled);
 dial.onkeydown({key:'Home',preventDefault(){}});const stopped=h.read('world.shots');assert.equal(h.read('world.power'),0);await h.advance(2);assert.equal(h.read('world.shots'),stopped);
 h.click('power-plus');await h.advance(2);assert.ok(h.read('world.shots')>before);h.click('reset');assert.equal(h.read('world.power'),.005);
});
test('held arrows ignore game speed and stop on blur, hidden tab, lost capture and reset',async()=>{
 const values=[];for(const fast of [false,true]){const h=harness();if(fast)h.click('speed');h.elements.get('power-plus').onpointerdown({button:0,pointerId:1,preventDefault(){}});await h.advance(1);values.push(h.read('world.power'));}assert.equal(values[0],values[1]);
 for(const cancel of ['blur','visibilitychange','lost','reset']){
  const h=harness(),button=h.elements.get('power-plus');button.onpointerdown({button:0,pointerId:2,preventDefault(){}});await h.advance(.5);
  if(cancel==='visibilitychange'){h.sandbox.document.hidden=true;h.listeners.visibilitychange();h.sandbox.document.hidden=false;}
  else if(cancel==='lost')button.onlostpointercapture({pointerId:2});else if(cancel==='reset')h.click('reset');else h.listeners.blur();
  const value=h.read('world.power');await h.advance(1);assert.equal(h.read('world.power'),value);
 }
 const h=harness();h.read('setPower(100)');h.click('power-plus');assert.equal(h.read('world.power'),1);h.read('setPower(0)');h.click('power-minus');assert.equal(h.read('world.power'),0);
});

test('narrow stage mouth rejects edge crossings while admitting centred balls',()=>{
 for(const [x,expected] of [[P.stage.intake.x,1],[P.stage.intake.x+6,0],[P.stage.intake.x-6,0]]){
  const w=new P.World();w.balls=[{id:1,x,y:P.stage.intake.y-1,vx:0,vy:300,age:2,released:true}];w.step();assert.equal(w.stageEntries,expected);
 }
});
test('handle transfer remains continuous and monotonic with finer sensitivity near left play',()=>{
 let old=0;for(let i=0;i<=1000;i++){const value=P.launchPower(i/1000);assert.ok(value>=old&&value-old<.003);old=value;}
 assert.equal(P.launchPower(.36),.36);assert.ok(Math.abs(P.launchPower(.9)-.9)<1e-9);
 assert.ok(P.launchPower(.405)-P.launchPower(.4)<.005);
 const h=harness();h.click('power-plus');assert.equal(h.read('world.power'),.365);h.click('power-minus');assert.equal(h.read('world.power'),.36);
});
test('normal reels stop left, right, then middle; speed and reset keep tracks consistent',async()=>{
 const h=harness();h.read('play({roll:.9,cue:.9,drama:.9},null)');
 assert.equal(h.elements.get('r0').className,'reel rolling');assert.equal(h.elements.get('r1').children[0].children.length,20);
 h.click('speed');assert.equal(h.elements.get('r1').children[0].style.animationDuration,String(.3/3)+'s');h.click('speed');
 await h.advance(4.4);assert.equal(h.elements.get('r0').className,'reel stopped');assert.equal(h.elements.get('r2').className,'reel rolling');
 await h.advance(.35);assert.equal(h.elements.get('r2').className,'reel stopped');assert.equal(h.elements.get('r1').className,'reel rolling');
 await h.advance(.5);assert.equal(h.elements.get('r1').className,'reel stopped');await h.advance(.8);assert.equal(h.read('spins'),1);
 h.read('play({roll:0,cue:0,drama:0},null)');h.click('reset');await h.advance(20);assert.equal(h.read('wins+paid'),0);assert.equal(h.elements.get('r1').children.length,0);
});

test('lower-left former wedge drains naturally without the age safety fallback',()=>{
 const w=new P.World();w.balls=Array.from({length:5},(_,i)=>({id:i+1,x:115-i*7.4,y:484.5-i*4.3,vx:0,vy:0,age:0,released:true,route:'free'}));w.shots=5;
 const expired=[];for(let i=0;i<240*30;i++)expired.push(...w.step().filter(e=>e.reason==='timeout'));
 assert.equal(w.balls.length,0);assert.equal(w.hits+w.misses,5);assert.equal(expired.length,0);
});
test('arched guide returns moderate shots to left while strong shots pass over to right',()=>{
 for(const power of [.36,.55,.9]){
  const w=new P.World({power,random:()=>.5});w.launch();let cross=null,turned=false;
  for(let i=0;i<240*10&&cross===null;i++){w.step();for(const b of w.balls)if(b.released){if(b.y<220&&b.vx<0)turned=true;if(b.y>250)cross=b.x;}}
  assert.notEqual(cross,null);if(power<.6){assert.ok(turned);assert.ok(cross<135);}else assert.ok(cross>434);
 }
});
test('return flap opens on outbound passage, settles and blocks a reverse ball',()=>{
 const w=new P.World({random:()=>.5});w.launch();let opened=0;for(let i=0;i<240*3;i++){w.step();opened=Math.max(opened,w.flapAngle);}assert.ok(opened>.1);runWorld(w,4,false);assert.ok(w.flapAngle<.02);
 const q=new P.World(),s=P.flapSegment(0),dx=s[2]-s[0],dy=s[3]-s[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 q.balls=[{id:1,x:(s[0]+s[2])/2+nx*P.RADIUS,y:(s[1]+s[3])/2+ny*P.RADIUS,vx:-100*nx,vy:-100*ny,released:true,age:0}];
 q.step();assert.ok(q.balls[0].vx>0);
});

test('compact pin lanes leave a full ball-width gap to every fixed wall',()=>{
 for(const p of P.pins)for(const [ax,ay,bx,by] of P.walls){
  const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)));
  const distance=Math.hypot(p.x-ax-t*dx,p.y-ay-t*dy);
  assert.ok(distance>p.r+2*P.RADIUS,`tight pin/wall gap at ${p.x},${p.y}`);
 }
});

test('stage approach guide sheds a wall-following ball without changing admission rules',()=>{
 const w=new P.World();w.balls=[{id:1,x:77,y:360,vx:0,vy:150,age:1,released:true}];let deflected=false;
 for(let i=0;i<240;i++){w.step();const ball=w.balls[0];if(ball.vx<-10)deflected=true;if(ball.y>P.stage.intake.y)break;}
 assert.ok(deflected);assert.equal(w.stageEntries,0);assert.equal(w.hits,0);assert.ok(w.balls[0].x<P.stage.intake.x-P.stage.intake.width/2+P.RADIUS);
});
