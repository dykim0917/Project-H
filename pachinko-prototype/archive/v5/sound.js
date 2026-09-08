/* Synthesized mechanical sounds, separated from musical machine cues. */
(function(root){
  'use strict';
  class Soundscape {
    constructor(context){
      this.ctx=context;this.muted=false;this.mechanicalLevel=.45;this.cueLevel=.6;this.last={};this.voices=0;
      this.master=context.createGain();this.master.gain.value=.7;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=10;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.12;
      this.master.connect(limiter);limiter.connect(context.destination);
      this.mechanical=context.createGain();this.cues=context.createGain();this.mechanical.connect(this.master);this.cues.connect(this.master);
      this.noise=context.createBuffer(1,Math.floor(context.sampleRate*.5),context.sampleRate);
      const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      this.roll=context.createBufferSource();this.roll.buffer=this.noise;this.roll.loop=true;
      const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
      this.rollGain=context.createGain();this.rollGain.gain.value=0;this.roll.connect(filter);filter.connect(this.rollGain);this.rollGain.connect(this.mechanical);this.roll.start();
      this.setLevels(.45,.6);
    }
    setLevels(mechanical,cues){this.mechanicalLevel=Math.max(0,Math.min(1,mechanical));this.cueLevel=Math.max(0,Math.min(1,cues));this.mechanical.gain.setTargetAtTime(this.mechanicalLevel,this.ctx.currentTime,.025);this.cues.gain.setTargetAtTime(this.cueLevel,this.ctx.currentTime,.025);}
    mute(value){this.muted=value;this.master.gain.setTargetAtTime(value?0:.7,this.ctx.currentTime,.015);}
    rolling(level){this.rollGain.gain.setTargetAtTime(Math.max(0,Math.min(1,level))*.025,this.ctx.currentTime,.08);}
    audible(bus){return !this.muted&&this.ctx.state==='running'&&this.voices<36&&(bus===this.mechanical?this.mechanicalLevel:this.cueLevel)>0;}
    output(gain,bus,x){
      if(typeof this.ctx.createStereoPanner==='function'){const pan=this.ctx.createStereoPanner();pan.pan.value=Math.max(-.7,Math.min(.7,(x-268)/300));gain.connect(pan);pan.connect(bus);return()=>pan.disconnect();}gain.connect(bus);return()=>{};
    }
    oscillator(frequency,duration,type,volume,bus,x=268){
      if(!this.audible(bus))return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),gain=this.ctx.createGain();
      o.type=type;o.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(Math.max(.0001,volume),t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(gain);const disconnect=this.output(gain,bus,x);this.voices++;o.onended=()=>{this.voices--;o.disconnect();gain.disconnect();disconnect();};o.start(t);o.stop(t+duration);
    }
    noiseHit(duration,frequency,volume,x){
      if(!this.audible(this.mechanical))return;const t=this.ctx.currentTime,s=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
      s.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
      gain.gain.setValueAtTime(Math.max(.0001,volume),t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(filter);filter.connect(gain);const disconnect=this.output(gain,this.mechanical,x);
      this.voices++;s.onended=()=>{this.voices--;s.disconnect();filter.disconnect();gain.disconnect();disconnect();};s.start(t);s.stop(t+duration);
    }
    tone(frequency,duration=.1,type='sine',volume=.025){this.oscillator(frequency,duration,type,volume,this.cues);}
    play(kind,{strength=100,x=268}={}){
      if(!this.audible(this.mechanical))return;
      const now=this.ctx.currentTime,gap=kind==='pin'?.055:kind==='ball'?.045:.07;
      if(now-(this.last[kind]??-100)<gap)return;this.last[kind]=now;
      const intensity=Math.max(.12,Math.min(1,strength/360));
      if(kind==='launch'){this.noiseHit(.045,900,.1,65);this.oscillator(180,.04,'triangle',.035,this.mechanical,65);}
      else if(kind==='pin'||kind==='ball'){
        const f=kind==='ball'?2900:1850+x*.85;
        this.noiseHit(.018,3800,.025*intensity,x);this.oscillator(f,.055,'sine',.032*intensity,this.mechanical,x);this.oscillator(f*1.47,.025,'sine',.009*intensity,this.mechanical,x);
      }else if(kind==='stage'){this.noiseHit(.075,680,.055,x);this.oscillator(480,.045,'triangle',.017,this.mechanical,x);}
      else if(kind==='drop'){this.noiseHit(.035,1200,.08,x);this.oscillator(1150,.055,'sine',.02,this.mechanical,x);}
      else if(kind==='pocket'){this.noiseHit(.04,1100,.08,x);this.oscillator(750,.065,'triangle',.025,this.mechanical,x);}
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=Soundscape;else root.PachinkoSound=Soundscape;
})(typeof globalThis!=='undefined'?globalThis:this);
