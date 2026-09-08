(function(root){
'use strict';
const P=typeof module!=='undefined'&&module.exports?require('../mark2/physics'):root.PachinkoMark2;
const TAU=Math.PI*2,STEP=TAU/9;
class Game{
 constructor(random=Math.random){Object.assign(this,{random,phase:'idle',time:0,queue:0,spins:0,wins:0,paid:0,reels:[1,2,3],angle:0,door:0,payout:0,win:false,reach:false});}
 enqueue(){if(this.queue<4)this.queue++;}
 begin(events){this.queue--;this.spins++;this.phase='spin';this.time=0;this.win=this.random()<1/19;this.reach=this.win||this.random()<.24;this.number=1+Math.floor(this.random()*9);this.final=this.win?this.number:1+(this.number-1+(this.random()<.5?1:8))%9;this.reels=[this.number,this.final,this.reach?this.number:1+this.number%9];events.push({type:'spin'});}
 tick(dt,events){this.time+=dt;
  if(this.phase==='idle'){if(this.queue)this.begin(events);}
  else if(this.phase==='spin'&&this.time>=2){
   if(this.reach){this.phase='reach';this.time=0;this.from=this.angle;const target=-(this.final-1)*STEP;this.to=this.from+TAU*4+((target-this.from)%TAU+TAU)%TAU;events.push({type:'reach'});}
   else{this.phase='result';this.time=0;events.push({type:'miss'});}
  }else if(this.phase==='reach'){
   const t=Math.min(1,this.time/5.8);this.angle=this.from+(this.to-this.from)*(1-Math.pow(1-t,3));
   if(t===1){this.phase=this.win?'payout':'result';this.time=0;this.payout=0;if(this.win){this.wins++;events.push({type:'win'});}else events.push({type:'miss'});}
  }else if(this.phase==='payout'){
   const amount=Math.min(300,Math.floor(this.time*60));if(amount>this.payout){const add=amount-this.payout;this.paid+=add;this.payout=amount;events.push({type:'payout',amount:add});}
   if(this.time>=5.6){this.phase='result';this.time=0;events.push({type:'bonus-end'});}
  }else if(this.phase==='result'&&this.time>=1.1){this.phase='idle';this.time=0;}
  const target=this.phase==='payout'?1:0;this.door+=Math.max(-dt*2,Math.min(dt*2,target-this.door));
 }
 get digits(){if(this.phase!=='spin'&&this.phase!=='reach')return this.reels;
  const cycle=offset=>1+(Math.floor(this.time*18)+offset)%9;
  if(this.phase==='reach')return[this.number,1+((Math.round(-this.angle/STEP)%9)+9)%9,this.number];
  return[this.time>1.05?this.reels[0]:cycle(0),cycle(3),this.time>1.65?this.reels[2]:cycle(6)];
 }
}
class World extends P.World{
 constructor(options={}){super(options);this.game=new Game(options.gameRandom||options.random||Math.random);}
 start(events){this.starts++;this.paid++;this.game.enqueue();events.push({type:'start'});}
 advanceMechanism(dt,events){this.game.tick(dt,events);this.wingOpen=0;this.wingTarget=0;this.mode=this.game.phase==='payout'?'bonus':'normal';this.phase='idle';this.flash=Math.max(0,this.flash-dt);this.winCount=this.game.wins;this.gateOpen=this.game.door;this.round=0;}
 step(dt=P.STEP,firing=false){const before=this.game.paid,events=super.step(dt,firing);this.paid+=this.game.paid-before;return events;}
}
const api={...P,World,Game};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PachinkoMark25=api;
})(typeof globalThis!=='undefined'?globalThis:this);
