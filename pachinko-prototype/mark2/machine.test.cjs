const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('./physics');
function rng(seed=123){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function run(w,seconds,firing=false){const events=[];for(let i=0;i<Math.round(seconds/P.STEP);i++)events.push(...w.step(P.STEP,firing));return events;}
function ball(extra={}){return{id:1,x:268,y:451,vx:0,vy:300,age:1,route:'drop',round:0,game:0,...extra};}
test('natural launch, starters, wing capture and V jackpots conserve every ball without timeouts',()=>{
 for(const seed of [123,456,789]){const w=new P.World({random:rng(seed)});const events=run(w,180,true).concat(run(w,45));assert.equal(w.shots,300);assert.equal(w.drained,300);assert.equal(w.balls.length,0);assert.equal(events.filter(e=>e.type==='timeout').length,0);assert.ok(w.starts>0);assert.ok(w.captures>0);assert.ok(w.winCount>0);assert.equal(w.mode,'normal');}
});
test('a closing wing cannot leave a free ball inside the solid chamber',()=>{
 const w=new P.World();w.wingOpen=.5;w.balls=[ball({route:'free',x:231.6,y:323,vx:38,vy:264})];
 w.step();assert.ok(w.balls[0].x<220-P.RADIUS);assert.equal(w.captures,0);
 const events=run(w,45);assert.equal(w.balls.length,0);assert.equal(w.winCount,0);assert.equal(events.some(e=>e.type==='timeout'),false);
});
test('a starter crossing opens wings but cannot award a jackpot',()=>{
 const w=new P.World();w.balls=[ball({x:175,y:551,route:'free'})];w.step();assert.equal(w.starts,1);assert.equal(w.winCount,0);assert.equal(w.paid,1);run(w,.2);assert.ok(w.wingOpen>.8);
});
test('the same inlet crossing is captured only while the physical wings are open',()=>{
 for(const open of [false,true]){const w=new P.World();w.wingOpen=open?1:0;w.openClock=open?1:0;w.balls=[ball({x:207,y:320,route:'free'})];w.step();assert.equal(w.captures,open?1:0);assert.equal(w.winCount,0);if(open)assert.equal(w.balls[0].route,'throat');}
});
test('only downward V crossings win; missing or moving upward never triggers a draw',()=>{
 for(const [x,y,vy,win]of[[268,451,300,true],[240,451,300,false],[268,453,-300,false]]){const w=new P.World({random:()=>{throw Error('No jackpot RNG allowed');}});w.balls=[ball({x,y,vy})];w.step();assert.equal(w.winCount,win?1:0);assert.equal(w.paid,win?50:0);}
});
test('captured balls from an earlier game cannot start another jackpot or continue a new round',()=>{
 const w=new P.World();w.win([]);w.finishBonus([]);w.balls=[ball()];w.step();assert.equal(w.winCount,1);assert.equal(w.mode,'normal');
 w.win([]);w.phase='release';w.balls=[ball({game:w.jackpotId,round:0})];w.step();assert.equal(w.continued,false);
});
test('bonus collects balls, releases them physically and advances a round after V entry',()=>{
 const w=new P.World();w.win([]);w.balls=[ball({route:'shelf',x:268,y:P.shelfY(268)-P.RADIUS,vx:0,vy:0,game:w.jackpotId,round:1})];w.step();assert.equal(w.held.length,1);assert.equal(w.balls[0].vx,0);
 const events=run(w,10);assert.ok(events.some(e=>e.type==='release'));assert.ok(events.some(e=>e.type==='v'));assert.equal(w.winCount,1);assert.equal(w.round,2);assert.equal(w.mode,'bonus');
});
test('an empty bonus round ends, and successful round eight returns to normal',()=>{
 const empty=new P.World();empty.win([]);run(empty,10);assert.equal(empty.mode,'normal');assert.equal(empty.round,0);
 const w=new P.World();w.win([]);w.round=8;w.balls=[ball({route:'held',x:268,y:403,vy:0,game:w.jackpotId,round:8})];run(w,10);assert.equal(w.mode,'normal');assert.equal(w.round,0);assert.equal(w.winCount,1);
});
test('stop and zero power drain existing balls and never spawn replacement balls',()=>{
 const w=new P.World({random:rng()});run(w,30,true);assert.equal(w.shots,50);w.power=0;run(w,45,true);assert.equal(w.shots,50);assert.equal(w.balls.length,0);assert.equal(w.mode,'normal');
});
function harness(){
 const elements=new Map(),listeners={};const html=fs.readFileSync(require.resolve('./index.html'),'utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])),noop=()=>{};
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const el=()=>({textContent:'',attributes:{},style:{setProperty(k,v){this[k]=v;}},focus:noop,setPointerCapture:noop,setAttribute(k,v){this.attributes[k]=v;},getContext:()=>ctx});let raf,time=0;const random=rng();
 const sandbox={PachinkoMark2:P,crypto:{getRandomValues:a=>(a[0]=Math.floor(random()*4294967296),a)},document:{hidden:false,getElementById:id=>{if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,el());return elements.get(id);},addEventListener:(key,fn)=>listeners[key]=fn},window:{addEventListener:(key,fn)=>listeners[key]=fn},requestAnimationFrame:fn=>raf=fn,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./app.js'),'utf8'),sandbox);
 return{elements,listeners,sandbox,read:s=>vm.runInContext(s,sandbox),click:id=>elements.get(id).onclick(),advance(seconds){for(let i=0;i<seconds*60;i++){time+=1000/60;raf(time);}}};
}
test('HUD integrates real V events; reset removes held balls, bonus state and pending actions',()=>{
 const h=harness();h.read("world.balls=[{id:1,x:268,y:451,vx:0,vy:300,age:1,route:'drop',round:0,game:0}]");h.advance(.3);assert.equal(h.elements.get('wins').textContent,1);assert.equal(h.read('world.mode'),'bonus');h.click('reset');assert.equal(h.read('world.winCount+world.paid+world.round+world.pending+world.balls.length'),0);h.advance(15);assert.equal(h.read('world.mode'),'normal');
});
test('3x scales mechanisms with balls; hidden tabs freeze both and cancel held arrows',()=>{
 const h=harness();h.click('speed');h.click('start');h.advance(10);assert.ok(h.read('world.shots')>=49&&h.read('world.shots')<=50);const before=h.read('JSON.stringify([world.time,world.shots,world.wingOpen,world.phaseTime])');
 h.elements.get('power-plus').onpointerdown({button:0,pointerId:1,preventDefault(){}});h.sandbox.document.hidden=true;h.listeners.visibilitychange();h.advance(5);assert.equal(h.read('JSON.stringify([world.time,world.shots,world.wingOpen,world.phaseTime])'),before);assert.equal(h.read('powerHold'),null);
 h.sandbox.document.hidden=false;h.listeners.visibilitychange();h.advance(.2);assert.ok(h.read('world.shots')<=51);
});
test('arrow hold is independent of game speed and release preserves the chosen strength',()=>{
 const results=[];for(const fast of [false,true]){const h=harness();if(fast)h.click('speed');const plus=h.elements.get('power-plus'),e={button:0,pointerId:1,preventDefault(){}};plus.onpointerdown(e);h.advance(1);plus.onpointerup(e);const value=h.read('world.power');h.advance(1);assert.equal(h.read('world.power'),value);results.push(value);}assert.equal(results[0],results[1]);
});
