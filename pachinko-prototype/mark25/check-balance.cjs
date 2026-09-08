const fs=require('node:fs'),path=require('node:path'),P=require('./game');
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const rows=[];
for(const width of [32,14])for(const power of [.36,.55,.9])for(const seed of [123,456,789]){
 P.starters.forEach(p=>p.width=width);
 const w=new P.World({power,random:rng(seed),gameRandom:rng(seed+10000)});let expired=0,idle=0,full=0,measured=0,activeSpins=0;
 for(let i=0;i<225/P.STEP;i++){
  const firing=i<180/P.STEP,events=w.step(P.STEP,firing);
  expired+=events.filter(e=>e.type==='timeout').length;
  if(firing){activeSpins=w.game.spins;if(i>10/P.STEP){measured++;if(w.game.phase==='idle'&&w.game.queue===0)idle++;if(w.game.queue===4)full++;}}
 }
 rows.push({width,power,seed,shots:w.shots,starts:w.starts,activeSpins,allSpins:w.game.spins,queue:w.game.queue,overflow:w.starts-w.game.spins-w.game.queue,idlePct:+(100*idle/measured).toFixed(1),fullPct:+(100*full/measured).toFixed(1),wins:w.winCount,residual:w.balls.length,expired});
}
P.starters.forEach(p=>p.width=14);
const summary=[];for(const width of [32,14])for(const power of [.36,.55,.9]){const r=rows.filter(x=>x.width===width&&x.power===power);summary.push({width,power,shots:r.reduce((s,x)=>s+x.shots,0),starts:r.reduce((s,x)=>s+x.starts,0),activeSpins:r.reduce((s,x)=>s+x.activeSpins,0),idlePct:+(r.reduce((s,x)=>s+x.idlePct,0)/r.length).toFixed(1),fullPct:+(r.reduce((s,x)=>s+x.fullPct,0)/r.length).toFixed(1)});}
fs.writeFileSync(path.join(__dirname,'reports/balance.json'),JSON.stringify({note:'Both geometry samples use current 1/29 draw odds and independent physical/draw random streams. 180s firing plus 45s drain per sample; idle/full percentages omit initial 10s.',balance:P.BALANCE,summary,rows},null,2)+'\n');console.log(summary);if(rows.some(r=>r.residual||r.expired))process.exitCode=1;
