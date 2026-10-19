/* Bounded autonomous flight; no input, player movement, or accumulated transforms. */
(function(global){
  'use strict';
  const PERIOD=12,BASE_HEIGHT=5,AMPLITUDE=1.2;
  function create(){return {enabled:true,time:0,height:BASE_HEIGHT-AMPLITUDE*Math.sin(Math.PI/5),target:.48};}
  function step(flight,dt,reduced){
    // Freeze in place for reduced motion / manual inspection, including tab resumes.
    if(flight.enabled&&!reduced){
      flight.time=(flight.time+Math.min(.12,Math.max(0,Number.isFinite(dt)?dt:0)))%PERIOD;
      const phase=flight.time/PERIOD*Math.PI*2;
      flight.target=.48+.38*Math.sin(phase);
      flight.height=BASE_HEIGHT+AMPLITUDE*Math.sin(phase-Math.PI/5);
    }
    return flight;
  }
  global.CourtyardButterflyFlight=Object.freeze({create,step,period:PERIOD,minHeight:BASE_HEIGHT-AMPLITUDE,maxHeight:BASE_HEIGHT+AMPLITUDE});
})(typeof window==='undefined'?globalThis:window);
