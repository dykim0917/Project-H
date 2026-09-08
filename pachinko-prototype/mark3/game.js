(function(root){
'use strict';
const P=typeof module!=='undefined'&&module.exports?require('../mark25/physics'):root.PachinkoMark25Physics;
const BALANCE=Object.freeze({winDenominator:29,missReachRate:.10,payout:300,rushBallChance:.38});
const TAU=Math.PI*2,STEP=TAU/9;
class Game{
 constructor(random=Math.random){Object.assign(this,{random,phase:'idle',time:0,queue:0,spins:0,wins:0,paid:0,reels:[1,2,3],angle:0,door:0,payout:0,win:false,reach:false,transform:0,chain:0,rushBalls:[],demo:false});}
 enqueue(){if(this.queue<4)this.queue++;}
 begin(events){this.queue--;this.spins++;this.phase='spin';this.time=0;this.win=this.random()<1/BALANCE.winDenominator;this.reach=this.win||this.random()<BALANCE.missReachRate;this.number=1+Math.floor(this.random()*9);this.final=this.win?this.number:1+(this.number-1+(this.random()<.5?1:8))%9;this.reels=[this.number,this.final,this.reach?this.number:1+this.number%9];events.push({type:'spin'});}
 startJackpot(events){this.wins++;this.chain=1;this.win=true;this.reels=Array(3).fill(this.number||7);this.phase='unlock';this.time=0;this.payout=0;events.push({type:'win'},{type:'unlock'});}
 beginRush(events){this.phase='rush';this.time=0;this.rushBalls=Array.from({length:3},(_,i)=>({end:this.random()*TAU,duration:2.5+i*.65,resolved:false,success:false}));events.push({type:'rush-start'});}
 tick(dt,events){this.time+=dt;
  if(this.phase==='idle'){if(this.queue)this.begin(events);}
  else if(this.phase==='spin'&&this.time>=2){
   if(this.reach){this.phase='reach';this.time=0;this.from=this.angle;const target=-(this.final-1)*STEP;this.to=this.from+TAU*4+((target-this.from)%TAU+TAU)%TAU;events.push({type:'reach'});}
   else{this.phase='result';this.time=0;events.push({type:'miss'});}
  }else if(this.phase==='reach'){
   const t=Math.min(1,this.time/5.8);this.angle=this.from+(this.to-this.from)*(1-Math.pow(1-t,3));
   if(t===1){if(this.win)this.startJackpot(events);else{this.phase='result';this.time=0;events.push({type:'miss'});}}
  }else if(this.phase==='unlock'){if(this.time>=.45){this.phase='payout';this.time=0;events.push({type:'payout-start'});}}else if(this.phase==='payout'||this.phase==='rush-pay'){
   const amount=Math.min(BALANCE.payout,Math.floor(this.time*BALANCE.payout/5));if(amount>this.payout){const add=amount-this.payout;this.paid+=add;this.payout=amount;events.push({type:'payout',amount:add});}
   if(this.time>=5.6){if(this.phase==='payout'){this.phase='opening';this.time=0;events.push({type:'motor'});}else this.beginRush(events);}
  }else if(this.phase==='opening'){if(this.time>=1.8)this.beginRush(events);
  }else if(this.phase==='rush'){
   for(const b of this.rushBalls)if(!b.resolved&&this.time>=b.duration){b.resolved=true;b.success=b.end<TAU*BALANCE.rushBallChance;events.push({type:b.success?'rush-hit':'rush-miss'});}
   if(this.time>=4.7){if(this.rushBalls.some(b=>b.success)){this.chain++;this.wins++;this.phase='rush-pay';this.time=0;this.payout=0;events.push({type:'win'});}else{this.phase='closing';this.time=0;events.push({type:'motor'},{type:'bonus-end'});}}
  }else if(this.phase==='closing'){if(this.time>=1.8){this.phase='result';this.time=0;this.rushBalls=[];this.win=false;}}
  else if(this.phase==='result'&&this.time>=1.1){this.phase='idle';this.time=0;}
  const open=['opening','rush','rush-pay'].includes(this.phase)?1:0;this.transform+=Math.max(-dt/1.5,Math.min(dt/1.5,open-this.transform));
  const target=['payout','rush-pay'].includes(this.phase)?1:0;this.door+=Math.max(-dt*2,Math.min(dt*2,target-this.door));
 }
 get digits(){if(this.phase!=='spin'&&this.phase!=='reach')return this.reels;
  const cycle=offset=>1+(Math.floor(this.time*18)+offset)%9;
  if(this.phase==='reach')return[this.number,1+((Math.round(-this.angle/STEP)%9)+9)%9,this.number];
  return[this.time>1.05?this.reels[0]:cycle(0),cycle(3),this.time>1.65?this.reels[2]:cycle(6)];
 }
}
class Tray{
 constructor(){this.balls=[];this.settled=[];this.credit=0;this.sequence=0;}
 step(dt,amount,events){
  this.credit+=amount;while(this.credit>=5){this.credit-=5;const i=++this.sequence;this.balls.push({x:268+Math.sin(i*8.3)*16,y:466,vx:Math.sin(i*4.7)*60,vy:30,age:0});}
  for(const b of this.balls){b.age+=dt;b.vy+=650*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<157||b.x>379){b.x=Math.max(157,Math.min(379,b.x));b.vx*=-.6;}
   if(b.y>672){b.y=672;const strength=b.vy;b.vy*=-.34;b.vx*=.7;if(strength>25)events.push({type:'tray-hit',strength,x:b.x});if(strength<35){b.done=true;this.settled.push({x:b.x,y:669-Math.floor(this.settled.length/18)*6});if(this.settled.length>36)this.settled.shift();}}
   if(b.age>4)b.done=true;
  }this.balls=this.balls.filter(b=>!b.done);
 }
}
class World extends P.World{
 constructor(options={}){super(options);this.game=new Game(options.gameRandom||options.random||Math.random);this.tray=new Tray();}
 start(events){this.starts++;this.paid++;this.game.enqueue();events.push({type:'start'});}
 advanceMechanism(dt,events){this.game.tick(dt,events);this.wingOpen=0;this.wingTarget=0;this.mode=['unlock','payout','opening','rush','rush-pay','closing'].includes(this.game.phase)?'bonus':'normal';this.phase='idle';this.flash=Math.max(0,this.flash-dt);this.winCount=this.game.wins;this.gateOpen=this.game.door;this.round=0;}
 step(dt=P.STEP,firing=false){const before=this.game.paid,events=super.step(dt,firing);const amount=this.game.paid-before;this.paid+=amount;this.tray.step(dt,amount,events);return events;}
}
const api={...P,World,Game,Tray,BALANCE};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PachinkoMark3=api;
})(typeof globalThis!=='undefined'?globalThis:this);
