(function(root){
'use strict';
const Base=typeof module!=='undefined'&&module.exports?require('../mark3/game'):root.PachinkoMark3;
// Keep the same award model to compare the mechanism rather than its generosity.
const RULES=Object.freeze({rounds:5,count:4,award:15,payRate:60,gap:.5,rightPower:.95,leftPower:.36});
const ATTACKER=Object.freeze({x:466,y:398,width:108});
class Game extends Base.Game{
 constructor(random){super(random);this.payQueue=0;this.payCredit=0;this.roundNo=0;this.roundCount=0;this.gap=0;this.loaded=0;}
 startJackpot(events){super.startJackpot(events);this.roundNo=1;this.roundCount=0;this.gap=0;}
 get accepting(){return (['payout','rush-pay'].includes(this.phase)&&this.roundCount<RULES.count&&this.gap===0)||this.phase==='charge';}
 get rightNeeded(){return ['unlock','payout','opening','charge','rush','rush-pay','closing'].includes(this.phase);}
 admit(events){
  if(!this.accepting)return false;
  if(this.phase==='charge'){
   this.loaded++;events.push({type:'capsule-load'});
   if(this.loaded===3)this.beginRush(events);
  }else{
   this.roundCount++;this.payQueue+=RULES.award;events.push({type:'attacker-in'});
   if(this.roundCount===RULES.count)this.gap=RULES.gap;
  }
  return true;
 }
 beginCharge(){this.phase='charge';this.time=0;this.loaded=0;this.rushBalls=[];}
 beginRush(events){
  super.beginRush(events);
  this.rushBalls.forEach((b,i)=>Object.assign(b,{releaseAt:.3+i*1.1,duration:1.6+i*1.1,released:false}));
 }
 tick(dt,events){
  const before=this.phase;
  if(['payout','rush-pay'].includes(this.phase)){
   this.time+=dt;
   if(this.roundCount===RULES.count){
    this.gap=Math.max(0,this.gap-dt);
    if(this.gap===0){
     if(this.roundNo<RULES.rounds){this.roundNo++;this.roundCount=0;events.push({type:'round'});}
     else if(this.phase==='payout'){this.phase='opening';this.time=0;events.push({type:'motor'});}
     else this.beginCharge();
    }
   }
  }else if(this.phase==='opening'){
   this.time+=dt;if(this.time>=1.8)this.beginCharge();
  }else if(this.phase==='charge'){this.time+=dt;}
  else{
   if(this.phase==='rush')for(const [i,b]of this.rushBalls.entries()){
    if(!b.released&&this.time+dt>=b.releaseAt){b.released=true;events.push({type:'capsule-release',slot:i});}
   }
   super.tick(dt,events);
   if(before==='rush'&&this.phase==='rush-pay'){this.roundNo=1;this.roundCount=0;this.gap=0;}
  }
  const target=['opening','charge','rush','rush-pay'].includes(this.phase)?1:0;
  // Base handles the other phases; custom phases need their own opening interpolation.
  if(['payout','rush-pay','opening','charge'].includes(before))this.transform+=Math.max(-dt/1.5,Math.min(dt/1.5,target-this.transform));
  this.door=this.accepting?1:0;
  if(this.payQueue>0){
   this.payCredit+=RULES.payRate*dt;
   const n=Math.min(this.payQueue,Math.floor(this.payCredit+1e-9));
   if(n){this.payCredit-=n;this.payQueue-=n;this.paid+=n;this.payout+=n;events.push({type:'payout',amount:n});}
  }else this.payCredit=0;
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
 constructor(options={}){super(options);this.game=new Game(options.gameRandom||options.random||Math.random);this.autoAim=options.autoAim??true;this.leftPower=options.power??RULES.leftPower;this.rightPower=RULES.rightPower;this.attackerEntries=0;}
 updateAim(){if(this.autoAim)this.power=this.game.rightNeeded?this.rightPower:this.leftPower;}
 setManualPower(power){this.autoAim=false;this.power=Math.max(0,Math.min(1,power));}
 advanceMechanism(dt,events){super.advanceMechanism(dt,events);if(this.game.phase==='charge')this.mode='bonus';this.updateAim();}
 start(events){if(!this.game.rightNeeded)super.start(events);}
 interceptBall(b,x0,y0,events){
  if(b.route!=='free'||b.done||!this.game.accepting||y0>=ATTACKER.y||b.y<ATTACKER.y||b.vy<=0)return false;
  const x=x0+(b.x-x0)*(ATTACKER.y-y0)/(b.y-y0);
  if(Math.abs(x-ATTACKER.x)>ATTACKER.width/2-Base.RADIUS)return false;
  if(!this.game.admit(events))return false;
  b.done=true;this.drained++;this.attackerEntries++;events.push({type:'pocket',x});return true;
 }
}
const api={...Base,Game,World,capsulePose,RULES,ATTACKER};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PachinkoMark4=api;
})(typeof globalThis!=='undefined'?globalThis:this);
