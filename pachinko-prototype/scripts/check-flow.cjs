const fs=require('node:fs'),path=require('node:path');
const baseline=process.argv[2]||'v6',version=process.argv[3]||'v7';
const versions={before:require('../archive/'+baseline+'/physics'),after:require('../physics')};
function simulate(P,seed,power){
 const w=new P.World({power,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}}),expired=[];let maxAge=0;
 for(let i=0;i<240*160;i++){
  const nearExpiry=new Map(w.balls.filter(b=>b.released&&b.route!=='stage'&&b.route!=='tube'&&b.age>=18-P.STEP).map(b=>[b.id,[b.x,b.y]]));
  const events=w.step(P.STEP,i<240*120);
  for(const e of events)if(e.reason==='timeout')expired.push([e.x,e.y]);
  if(!P.canopy)for(const [id,xy] of nearExpiry)if(!w.balls.some(b=>b.id===id))expired.push(xy);
  for(const b of w.balls)maxAge=Math.max(maxAge,b.age);
 }
 return{shots:w.shots,hits:w.hits,stage:w.stageEntries,right:w.rightExits,remaining:w.balls.length,maxAge:+maxAge.toFixed(2),expired:expired.map(xy=>xy.map(n=>+n.toFixed(2)))};
}
const report={baseline,version,conditions:'200 shots per run, 120 seconds firing plus 40 seconds drain. General pocket, stage ON. Seeds 123/456/789.',runs:[]};
for(const power of [.36,.55,.9])for(const seed of [123,456,789]){const row={power,seed};for(const [key,P]of Object.entries(versions))row[key]=simulate(P,seed,power);report.runs.push(row);}
fs.writeFileSync(path.join(__dirname,'../reports/'+version+'-flow.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.runs.map(r=>({power:r.power,seed:r.seed,beforeExpired:r.before.expired.length,...r.after})),null,2));
