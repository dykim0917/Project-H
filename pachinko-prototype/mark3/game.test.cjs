const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('./game');
function rng(seed=123){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function tick(g,seconds){const events=[];for(let i=0;i<Math.round(seconds/P.STEP);i++)g.tick(P.STEP,events);return events;}
function harness(){
 const elements=new Map(),listeners={};const html=fs.readFileSync(require.resolve('./index.html'),'utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])),noop=()=>{};
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const el=()=>({textContent:'',attributes:{},style:{setProperty(k,v){this[k]=v;}},focus:noop,setPointerCapture:noop,setAttribute(k,v){this.attributes[k]=v;},getContext:()=>ctx});let raf,time=0;const random=rng();
 const sandbox={PachinkoMark3:P,crypto:{getRandomValues:a=>(a[0]=Math.floor(random()*4294967296),a)},document:{hidden:false,getElementById:id=>{if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,el());return elements.get(id);},addEventListener:(key,fn)=>listeners[key]=fn},window:{addEventListener:(key,fn)=>listeners[key]=fn},requestAnimationFrame:fn=>raf=fn,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./app.js'),'utf8'),sandbox);
 return{elements,listeners,sandbox,read:s=>vm.runInContext(s,sandbox),click:id=>elements.get(id).onclick(),advance(seconds){for(let i=0;i<seconds*60;i++){time+=1000/60;raf(time);}}};
}
test('initial win pays, transforms once and stays open across a continuation',()=>{
 const g=new P.Game(()=>0);g.enqueue();tick(g,8);assert.equal(g.phase,'unlock');tick(g,8);assert.equal(g.phase,'rush');assert.equal(g.transform,1);assert.equal(g.paid,300);
 tick(g,5);assert.equal(g.phase,'rush-pay');assert.equal(g.chain,2);assert.equal(g.transform,1);
 const events=tick(g,7);assert.equal(g.phase,'rush');assert.equal(g.transform,1);assert.equal(g.paid,600);assert.equal(events.some(e=>e.type==='motor'),false);
});
test('three misses close the machine and consume held normal starts afterward',()=>{
 const g=new P.Game(()=>.9);g.startJackpot([]);g.enqueue();tick(g,15);assert.equal(g.transform,0);assert.equal(g.chain,1);assert.equal(g.paid,300);assert.equal(g.spins,0);tick(g,3);assert.equal(g.spins,1);assert.equal(g.queue,0);
});
test('one successful ball awards only one continuation and payout regardless of three successes',()=>{
 for(const seq of [[.1,.9,.9],[.1,.2,.3]]){const g=new P.Game(()=>seq.shift()??.9);g.chain=1;g.transform=1;g.beginRush([]);tick(g,5);assert.equal(g.chain,2);assert.equal(g.wins,1);tick(g,6);assert.equal(g.paid,300);}
});
test('payout shower produces tray impacts, drains and stays bounded across repeated payouts',()=>{
 const tray=new P.Tray(),events=[];for(let i=0;i<30/P.STEP;i++)tray.step(P.STEP,i<20/P.STEP?60*P.STEP:0,events);assert.equal(tray.balls.length,0);assert.ok(tray.settled.length<=36);assert.ok(events.some(e=>e.type==='tray-hit'&&e.strength>100));assert.equal(tray.sequence,240);
});
test('rush probability corresponds to three independent green-sector stops',()=>{
 const g=new P.Game(rng(882));let hits=0;for(let i=0;i<50000;i++){g.beginRush([]);if(g.rushBalls.some(b=>b.end<Math.PI*2*P.BALANCE.rushBallChance))hits++;}assert.ok(Math.abs(hits/50000-(1-Math.pow(1-P.BALANCE.rushBallChance,3)))<.007);
});
test('world payout count equals game awards plus starter rewards',()=>{
 const w=new P.World({gameRandom:()=>.9});w.game.startJackpot([]);for(let i=0;i<20/P.STEP;i++)w.step();assert.equal(w.paid,300);assert.equal(w.winCount,1);assert.equal(w.tray.balls.length,0);assert.equal(w.game.transform,0);
});
test('demo is explicitly marked, reset clears rush and particles, hidden tab freezes all motion',()=>{
 const h=harness();h.click('demo');assert.equal(h.read('world.game.demo'),true);h.advance(10);assert.ok(h.read('world.game.transform')>0);
 h.sandbox.document.hidden=true;h.listeners.visibilitychange();const before=h.read('JSON.stringify([world.game.time,world.game.transform,world.paid,world.tray.balls])');h.advance(10);assert.equal(h.read('JSON.stringify([world.game.time,world.game.transform,world.paid,world.tray.balls])'),before);
 h.sandbox.document.hidden=false;h.listeners.visibilitychange();h.click('reset');assert.equal(h.read('world.game.demo'),false);assert.equal(h.read('world.paid+world.game.transform+world.game.queue+world.tray.balls.length'),0);
});
test('normal speed preserves rush timing and arrow release remains stable',()=>{
 const h=harness();h.click('demo');h.advance(3);assert.equal(h.read('world.game.transform'),0);assert.equal(h.read('world.game.phase'),'payout');h.advance(7);assert.equal(h.read('world.game.transform'),1);const e={button:0,pointerId:1,preventDefault(){}};const plus=h.elements.get('power-plus');plus.onpointerdown(e);h.advance(1);plus.onpointerup(e);const power=h.read('world.power');h.advance(1);assert.equal(h.read('world.power'),power);
});
test('continuous sound layers can be silenced and impact voices stay bounded',()=>{
 const Sound=require('./sound'),param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),pan:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
 const ctx={state:'running',currentTime:0,sampleRate:8000,destination:{},createGain:node,createDynamicsCompressor:node,createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:node,createBiquadFilter:node,createOscillator:node,createStereoPanner:node};
 const sound=new Sound(ctx);sound.motion(1,true);assert.ok(sound.pourGain.gain.value>0);assert.ok(sound.motorGain.gain.value>0);for(let i=0;i<200;i++){ctx.currentTime+=.04;sound.impact({strength:400,x:268});}assert.equal(sound.voices,0);sound.motion(0,false);assert.equal(sound.pourGain.gain.value,0);assert.equal(sound.motorGain.gain.value,0);sound.mute(true);assert.equal(sound.master.gain.value,0);
});
