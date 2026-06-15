/**
 * PHYSIO SUAI – Background Audio Player v3 (Capacitor)
 * Keeps music playing when app is minimized by starting BackgroundAudioService.
 */
(function(window){
  'use strict';
  var _media=null, _src=null, _playing=false, _trackInfo={}, _onEnd=null;

  window.BackgroundAudio={
    play:function(src,opts){
      opts=opts||{}; _trackInfo=opts;
      _startFgService(opts.title||'Now Playing', opts.artist||'Physio SUAI');
      if(_media && _src===src && !_playing){ _media.play(); _playing=true; return; }
      this.stop();
      _src=src;
      var audio=new Audio(src);
      audio.volume=opts.volume!==undefined?opts.volume:1.0;
      audio.loop=opts.loop||false;
      audio.onended=function(){ _playing=false; if(_onEnd)_onEnd(); };
      audio.play().then(function(){ _playing=true; }).catch(function(e){ console.warn('[BgAudio]',e); });
      _media=audio;
    },
    pause:function(){ if(_media){ _media.pause(); _playing=false; } },
    resume:function(){ if(_media&&!_playing){ _media.play(); _playing=true; } },
    stop:function(){
      if(_media){ try{_media.pause();_media.src='';}catch(e){} _media=null; }
      _src=null; _playing=false;
      _stopFgService();
    },
    isPlaying:function(){ return _playing; },
    onEnded:function(cb){ _onEnd=cb; },
    setTrack:function(info){ _trackInfo=Object.assign(_trackInfo,info); _startFgService(_trackInfo.title,_trackInfo.artist); },
    seekTo:function(ms){ if(_media) _media.currentTime=ms/1000; },
    getDuration:function(){ return _media?(_media.duration*1000):0; },
    getCurrentPosition:function(){ return Promise.resolve(_media?(_media.currentTime*1000):0); }
  };

  function _startFgService(title,text){
    try{
      // Start Android foreground service via registered Capacitor plugin
      if(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()){
        var plugin = window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundAudio;
        if(plugin && plugin.start){
          plugin.start({title:title||'Physio SUAI',artist:text||'Playing'}).catch(function(e){console.warn('[BgAudio] start error',e);});
        }
      }
    }catch(e){}
  }
  function _stopFgService(){
    try{
      if(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()){
        var plugin = window.Capacitor.Plugins && window.Capacitor.Plugins.BackgroundAudio;
        if(plugin && plugin.stop){
          plugin.stop({}).catch(function(e){console.warn('[BgAudio] stop error',e);});
        }
      }
    }catch(e){}
  }

  // Keep WebView alive in background (prevent audio context suspension)
  document.addEventListener('pause',function(){
    if(_playing){
      try{ var ctx=new(window.AudioContext||window.webkitAudioContext)(); ctx.resume(); }catch(e){}
    }
  },false);

  console.log('[BackgroundAudio] Ready');
})(window);
