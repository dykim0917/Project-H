const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('./game');
function rng(seed=123){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function tick(g,seconds){const events=[];for(let i=0;i<Math.round(seconds/P.STEP);i++)g.tick(P.STEP,events);return events;}
function harness(){
 const elements=new Map(),listeners={};const html=fs.readFileSync(require.resolve('./index.html'),'utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])),noop=()=>{};
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const el=()=>({textContent:'',attributes:{},style:{setProperty(k,v){this[k]=v;}},focus:noop,setPointerCapture:noop,setAttribute(k,v){this.attributes[k]=v;},getContext:()=>ctx});let raf,time=0;const random=rng();
 const sandbox={PachinkoMark25:P,crypto:{getRandomValues:a=>(a[0]=Math.floor(random()*4294967296),a)},document:{hidden:false,getElementById:id=>{if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,el());return elements.get(id);},addEventListener:(key,fn)=>listeners[key]=fn},window:{addEventListener:(key,fn)=>listeners[key]=fn},requestAnimationFrame:fn=>raf=fn,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./app.js'),'utf8'),sandbox);
 return{elements,listeners,sandbox,read:s=>vm.runInContext(s,sandbox),click:id=>elements.get(id).onclick(),advance(seconds){for(let i=0;i<seconds*60;i++){time+=1000/60;raf(time);}}};
}
test('a winning spin reaches, aligns the wheel and pays exactly once',()=>{
 const g=new P.Game(()=>0);g.enqueue();tick(g,2.1);assert.equal(g.phase,'reach');assert.deepEqual([g.digits[0],g.digits[2]],[1,1]);
 const events=tick(g,6);assert.equal(g.phase,'payout');assert.equal(g.wins,1);assert.deepEqual(g.digits,[1,1,1]);assert.ok(Math.abs(Math.sin(g.angle))<1e-9);
 tick(g,20);assert.equal(g.paid,300);assert.equal(g.wins,1);assert.equal(g.phase,'idle');assert.equal(g.spins,1);assert.ok(events.some(e=>e.type==='win'));
});
test('misses and reach misses never pay; the wheel points to its final digit',()=>{
 for(const reach of [false,true]){const sequence=[.8,reach?.05:.9,.55,.9];const g=new P.Game(()=>sequence.shift()??.8);g.enqueue();const events=tick(g,20);assert.equal(g.wins,0);assert.equal(g.paid,0);assert.equal(g.phase,'idle');assert.equal(events.some(e=>e.type==='reach'),reach);assert.notEqual(g.reels[0],g.reels[1]);if(reach){const index=((Math.round(-g.angle/(Math.PI*2/9))%9)+9)%9;assert.equal(index+1,g.final);}}
});
test('four held starts survive payout and are consumed once each',()=>{
 const g=new P.Game(()=>0);g.enqueue();tick(g,.1);for(let i=0;i<20;i++)g.enqueue();assert.equal(g.queue,4);tick(g,90);assert.equal(g.spins,5);assert.equal(g.wins,5);assert.equal(g.paid,1500);assert.equal(g.queue,0);
});
test('physical starter awards a queued draw, never opens wings, and payout agrees with HUD total',()=>{
 const w=new P.World({gameRandom:()=>0});w.balls=[{id:1,x:175,y:551,vx:0,vy:300,age:0,route:'free'}];w.step();assert.equal(w.starts,1);assert.equal(w.game.queue,1);
 for(let i=0;i<20/P.STEP;i++){w.step();assert.equal(w.wingOpen,0);}assert.equal(w.game.wins,1);assert.equal(w.winCount,1);assert.equal(w.paid,301);assert.equal(w.game.phase,'idle');
});
test('natural firing at three strengths conserves balls without timeout',()=>{
 for(const power of [.36,.55,.9]){const w=new P.World({power,random:rng(),gameRandom:rng(456)});let expired=0;for(let i=0;i<165/P.STEP;i++)for(const e of w.step(P.STEP,i<120/P.STEP))if(e.type==='timeout')expired++;assert.equal(w.shots,200);assert.equal(w.drained,200);assert.equal(w.balls.length,0);assert.equal(expired,0);if(power<.9)assert.ok(w.game.spins>0);}
});
test('reset clears active reach, payout, holds and rendered counters',()=>{
 const h=harness();h.read('world.game.random=()=>0;world.game.enqueue()');h.advance(3);assert.equal(h.read('world.game.phase'),'reach');h.click('reset');assert.equal(h.read('world.game.phase'),'idle');h.advance(10);assert.equal(h.read('world.paid+world.game.queue+world.winCount'),0);assert.equal(h.elements.get('starts').textContent,0);
});
test('hidden tabs freeze the wheel and payout as well as balls',()=>{
 const h=harness();h.read('world.game.random=()=>0;world.game.enqueue()');h.advance(3);h.sandbox.document.hidden=true;h.listeners.visibilitychange();const before=h.read('JSON.stringify([world.time,world.game.time,world.game.angle,world.paid])');h.advance(10);assert.equal(h.read('JSON.stringify([world.time,world.game.time,world.game.angle,world.paid])'),before);h.sandbox.document.hidden=false;h.listeners.visibilitychange();h.advance(12);assert.equal(h.read('world.paid'),300);
});
test('hold arrows preserve strength on release and remain independent of simulation speed',()=>{
 const values=[];for(const fast of [false,true]){const h=harness();if(fast)h.click('speed');const plus=h.elements.get('power-plus'),e={button:0,pointerId:1,preventDefault(){}};plus.onpointerdown(e);h.advance(1);plus.onpointerup(e);values.push(h.read('world.power'));h.advance(1);assert.equal(h.read('world.power'),values.at(-1));}assert.equal(values[0],values[1]);
});
test('narrow starter admits the center but not a ball outside the visible aperture',()=>{
 for(const [x,accepted] of [[175,true],[181,false]]){const w=new P.World();w.balls=[{id:1,x,y:551,vx:0,vy:300,age:0,route:'free'}];w.step();assert.equal(w.starts,accepted?1:0);assert.equal(w.game.queue,accepted?1:0);}
});
test('draw odds and conditional reach frequency match the configured independent lottery',()=>{
 const g=new P.Game(rng(9123));let wins=0,missReaches=0;const count=100000;
 for(let i=0;i<count;i++){g.enqueue();g.begin([]);if(g.win)wins++;else if(g.reach)missReaches++;}
 assert.ok(Math.abs(wins/count-1/P.BALANCE.winDenominator)<.002);
 assert.ok(Math.abs(missReaches/(count-wins)-P.BALANCE.missReachRate)<.003);
});
