(function(root){
'use strict';
const Base=typeof module!=='undefined'&&module.exports?require('../mark3/game'):root.PachinkoMark3;
// Keep the same award model to compare the mechanism rather than its generosity.
class Game extends Base.Game{
 beginRush(events){
  super.beginRush(events);
  this.rushBalls.forEach((b,i)=>Object.assign(b,{releaseAt:.3+i*1.1,duration:1.6+i*1.1,released:false}));
 }
 tick(dt,events){
  if(this.phase==='rush')for(const [i,b]of this.rushBalls.entries()){
   if(!b.released&&this.time+dt>=b.releaseAt){b.released=true;events.push({type:'capsule-release',slot:i});}
  }
  super.tick(dt,events);
 }
}
// The staged ball path represents a preselected outcome, not a second physics lottery.
function capsulePose(ball,index,time){
 const success=ball.end<Math.PI*2*Base.BALANCE.rushBallChance;
 const u=ball.resolved?1:Math.max(0,Math.min(1,(time-ball.releaseAt)/(ball.duration-ball.releaseAt)));
 const origin=230+index*38;
 if(u===0)return{x:origin,y:314,stage:'stored',success};
 if(u<.45){const t=u/.45;return{x:origin+(268-origin)*t,y:314+62*t*t,stage:'falling',success};}
 const t=(u-.45)/.55,side=success?1:-1;
 return{x:268+side*(49+index*6)*t,y:376+63*t,stage:u===1?'landed':'sorted',success};
}
class World extends Base.World{
 constructor(options={}){super(options);this.game=new Game(options.gameRandom||options.random||Math.random);}
}
const api={...Base,Game,World,capsulePose};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PachinkoMark4=api;
})(typeof globalThis!=='undefined'?globalThis:this);
