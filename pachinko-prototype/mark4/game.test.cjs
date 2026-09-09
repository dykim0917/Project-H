const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('./game');
function rng(seed=123){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function tick(g,seconds){const events=[];for(let i=0;i<Math.round(seconds/P.STEP);i++)g.tick(P.STEP,events);return events;}
function harness(){
 const elements=new Map(),listeners={};const html=fs.readFileSync(require.resolve('./index.html'),'utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])),noop=()=>{};
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const el=()=>({textContent:'',attributes:{},style:{setProperty(k,v){this[k]=v;}},focus:noop,setPointerCapture:noop,setAttribute(k,v){this.attributes[k]=v;},getContext:()=>ctx});let raf,time=0;const random=rng();
 const sandbox={PachinkoMark4:P,crypto:{getRandomValues:a=>(a[0]=Math.floor(random()*4294967296),a)},document:{hidden:false,getElementById:id=>{if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,el());return elements.get(id);},addEventListener:(key,fn)=>listeners[key]=fn},window:{addEventListener:(key,fn)=>listeners[key]=fn},requestAnimationFrame:fn=>raf=fn,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./app.js'),'utf8'),sandbox);
 return{elements,listeners,sandbox,read:s=>vm.runInContext(s,sandbox),click:id=>elements.get(id).onclick(),advance(seconds){for(let i=0;i<seconds*60;i++){time+=1000/60;raf(time);}}};
}
test('jackpot without balls cannot pay or advance; each round requires four admissions',()=>{
 const g=new P.Game(()=>.9);g.startJackpot([]);tick(g,30);assert.equal(g.paid,0);assert.equal(g.phase,'payout');
 for(let r=1;r<=5;r++){assert.equal(g.roundNo,r);for(let i=0;i<4;i++)assert.equal(g.admit([]),true);assert.equal(g.admit([]),false);tick(g,1.1);}
 assert.equal(g.paid,300);tick(g,3);assert.equal(g.phase,'charge');assert.equal(g.rushBalls.length,0);
 for(let i=0;i<3;i++)g.admit([]);assert.equal(g.phase,'rush');tick(g,7);assert.equal(g.chain,1);assert.equal(g.paid,300);
});
test('already earned payout drains at the fixed rate with no new admission',()=>{
 const g=new P.Game(()=>.9);g.startJackpot([]);tick(g,1);g.admit([]);tick(g,.1);assert.equal(g.paid,6);tick(g,5);assert.equal(g.paid,15);assert.equal(g.roundCount,1);assert.equal(g.phase,'payout');
});
test('three charged balls release in order and a successful cycle opens five new rounds',()=>{
 const g=new P.Game(()=>.1);g.chain=1;g.beginCharge();for(let i=0;i<3;i++)g.admit([]);
 const e=tick(g,4.8);assert.deepEqual(e.filter(x=>x.type==='capsule-release').map(x=>x.slot),[0,1,2]);assert.equal(g.phase,'rush-pay');assert.equal(g.chain,2);assert.equal(g.roundNo,1);assert.equal(g.roundCount,0);assert.equal(g.paid,0);
});
test('only full downward physical crossings into an open attacker are consumed',()=>{
 const w=new P.World();const b=()=>({route:'free',x:466,y:400,vy:80,done:false});assert.equal(w.interceptBall(b(),466,397,[]),false);
 w.game.startJackpot([]);tick(w.game,1);const e=[];let ball=b();assert.equal(w.interceptBall(ball,466,397,e),true);assert.equal(ball.done,true);assert.equal(w.interceptBall(ball,466,397,e),false);assert.equal(w.attackerEntries,1);
 assert.equal(w.interceptBall({...b(),x:200},200,397,[]),false);assert.equal(w.interceptBall({...b(),vy:-80},466,401,[]),false);
});
test('automatic right firing fills five rounds and three rush balls, then restores left power',()=>{
 const w=new P.World({random:rng(91),gameRandom:()=>.9});w.game.startJackpot([]);const phases=new Set();let timeouts=0;
 for(let i=0;i<90/P.STEP;i++){const e=w.step(P.STEP,true);timeouts+=e.filter(x=>x.type==='timeout').length;phases.add(w.game.phase);}
 assert.equal(w.game.paid,300);assert.equal(w.attackerEntries,23);assert.ok(phases.has('charge')&&phases.has('rush'));assert.equal(w.power,.36);assert.equal(timeouts,0);
});
test('manual aim remains set during bonus and auto can resume immediately',()=>{
 const w=new P.World();w.setManualPower(.36);w.game.startJackpot([]);w.step();assert.equal(w.power,.36);w.autoAim=true;w.updateAim();assert.equal(w.power,.95);
});
test('demo starts real automatic firing; manual controls, reset and hidden state work',()=>{
 const h=harness();h.click('demo');h.advance(3);assert.equal(h.read('running'),true);assert.equal(h.read('world.autoAim'),true);assert.equal(h.read('world.power'),.95);
 h.click('aim');h.read('setPower(36)');h.advance(1);assert.equal(h.read('world.autoAim'),false);assert.equal(h.read('world.power'),.36);
 h.sandbox.document.hidden=true;h.listeners.visibilitychange();const before=h.read('JSON.stringify([world.time,world.paid,world.game.payQueue])');h.advance(5);assert.equal(h.read('JSON.stringify([world.time,world.paid,world.game.payQueue])'),before);
 h.sandbox.document.hidden=false;h.listeners.visibilitychange();h.click('reset');assert.equal(h.read('world.game.payQueue+world.attackerEntries+world.paid'),0);assert.equal(h.read('world.autoAim'),true);
});
test('browser script entry points load together and execute physical right-shot payout',()=>{
 const path=require('node:path'),ctx=vm.createContext({console});
 const html=fs.readFileSync(require.resolve('./index.html'),'utf8');
 for(const m of html.matchAll(/<script src="([^"]+)"/g)){
  const file=m[1].split('?')[0];if(file==='app.js')continue;
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,file),'utf8'),ctx);
 }
 const result=vm.runInContext(`(()=>{let seed=91;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const P=PachinkoMark4,w=new P.World({random,gameRandom:()=>.9});w.game.startJackpot([]);for(let i=0;i<60/P.STEP;i++)w.step(P.STEP,true);return{paid:w.game.paid,entries:w.attackerEntries};})()`,ctx);
 assert.equal(result.paid,300);assert.equal(result.entries,23);
});
