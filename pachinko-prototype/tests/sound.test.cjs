const test=require('node:test'),assert=require('node:assert/strict'),Sound=require('../sound.js');
function audio(){
 const sources=[],nodes=[];
 function param(){return{value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}};}
 function node(source=false){const n={connect(){},disconnect(){this.disconnected=true;},start(){},stop(){},gain:param(),pan:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};nodes.push(n);if(source)sources.push(n);return n;}
 return{sources,nodes,state:'running',currentTime:0,sampleRate:48000,destination:{},createGain:()=>node(),createDynamicsCompressor:()=>node(),createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>node(true),createBiquadFilter:()=>node(),createStereoPanner:()=>node(),createOscillator:()=>node(true),finish(){for(const s of sources.splice(0))s.onended?.();}};
}
test('mechanical and cue levels are independent; mute prevents new voices',()=>{
 const ctx=audio(),s=new Sound(ctx);s.setLevels(0,.6);s.play('launch');assert.equal(s.voices,0);s.tone(440);assert.equal(s.voices,1);ctx.finish();
 s.setLevels(.45,0);s.tone(440);assert.equal(s.voices,0);s.play('launch');assert.equal(s.voices,2);ctx.finish();
 s.mute(true);s.play('pin');s.tone(440);assert.equal(s.voices,0);assert.equal(s.master.gain.value,0);s.mute(false);assert.equal(s.master.gain.value,.7);
});
test('dense contacts are throttled, voices capped, and ended sources release their audio path',()=>{
 const ctx=audio(),s=new Sound(ctx);for(let i=0;i<100;i++)s.play('pin');assert.equal(s.voices,3);
 for(let i=0;i<100;i++)s.tone(440);assert.equal(s.voices,36);const temporary=ctx.nodes.slice(7);ctx.finish();assert.equal(s.voices,0);assert.ok(temporary.every(n=>n.disconnected));
 s.rolling(10);assert.equal(s.rollGain.gain.value,.025);s.rolling(0);assert.equal(s.rollGain.gain.value,0);
 ctx.state='suspended';s.play('drop');assert.equal(s.voices,0);
});
