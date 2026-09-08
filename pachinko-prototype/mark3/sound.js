(function(root){
const Base=typeof module!=='undefined'&&module.exports?require('../sound'):root.PachinkoSound;
class RushSound extends Base{
 constructor(ctx){super(ctx);
  this.pourGain=ctx.createGain();this.pourGain.gain.value=0;const noise=ctx.createBufferSource();noise.buffer=this.noise;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=2600;filter.Q.value=.55;noise.connect(filter);filter.connect(this.pourGain);this.pourGain.connect(this.mechanical);noise.start();
  this.motorGain=ctx.createGain();this.motorGain.gain.value=0;const motor=ctx.createOscillator();motor.type='sawtooth';motor.frequency.value=92;const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=420;motor.connect(low);low.connect(this.motorGain);this.motorGain.connect(this.mechanical);motor.start();
 }
 motion(pour,motor){this.pourGain.gain.setTargetAtTime(Math.min(1,Math.max(0,pour))*.12,this.ctx.currentTime,.09);this.motorGain.gain.setTargetAtTime(motor?.045:0,this.ctx.currentTime,.08);}
 impact({strength,x}){const now=this.ctx.currentTime;if(now-(this.last.tray??-100)<.027)return;this.last.tray=now;const v=Math.min(1,strength/450);this.noiseHit(.035,3200,.09*v,x);this.oscillator(2100+x*1.2,.11,'sine',.055*v,this.mechanical,x);this.oscillator(370,.18,'triangle',.027*v,this.mechanical,x);}
 latch(){this.noiseHit(.12,570,.15,268);this.oscillator(110,.22,'triangle',.07,this.mechanical);}
}
if(typeof module!=='undefined'&&module.exports)module.exports=RushSound;else root.PachinkoRushSound=RushSound;
})(typeof globalThis!=='undefined'?globalThis:this);
