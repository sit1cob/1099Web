import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiService from '../api/apiService';
import { Bot, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';

const SashaChatPage = ({ active = true }: { active?: boolean }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const baseChatUrl = 'https://tm-qa.searskairos.ai/';
  const token = ApiService.getToken() || '';

  // Construct URL with auth query params
  const iframeUrl = token
    ? `${baseChatUrl}?token=${encodeURIComponent(token)}&accessToken=${encodeURIComponent(token)}`
    : baseChatUrl;

  // Set shared authorization cookies on mount and reload key change
  useEffect(() => {
    if (token) {
      try {
        const isProdDomain = window.location.hostname.endsWith('searskairos.ai');
        const domainSuffix = isProdDomain ? '; domain=.searskairos.ai' : '';
        const cookieStr = `; path=/${domainSuffix}; max-age=86400; SameSite=Lax; Secure`;
        
        document.cookie = `accessToken=${token}${cookieStr}`;
        document.cookie = `access_token=${token}${cookieStr}`;
        document.cookie = `token=${token}${cookieStr}`;
        document.cookie = `refreshToken=${token}${cookieStr}`;
      } catch (e) {
        console.warn('SashaChatPage: Failed to set shared cookies:', e);
      }
    }
  }, [token, reloadKey]);

  // Handle visibility change and unmount to silence global SpeechSynthesis
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          window.speechSynthesis?.cancel();
        } catch (e) {
          console.warn('SashaChatPage: SpeechSynthesis cancel error:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try {
        window.speechSynthesis?.cancel();
      } catch (e) {
        console.warn('SashaChatPage: SpeechSynthesis cancel error:', e);
      }
    };
  }, []);

  // Monitor internal page focus/blur switches to silence SpeechSynthesis and update iframe state
  useEffect(() => {
    if (!active) {
      try {
        window.speechSynthesis?.cancel();
      } catch (e) {
        console.warn('SashaChatPage: SpeechSynthesis cancel error:', e);
      }

      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'visibility', visible: false }, baseChatUrl);
        } catch (err) {
          console.warn('SashaChatPage: Failed to post deactivation message:', err);
        }
      }
    } else {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'visibility', visible: true }, baseChatUrl);
        } catch (err) {
          console.warn('SashaChatPage: Failed to post activation message:', err);
        }
      }
    }
  }, [active]);

  // Handle iframe onload: hide loader and dispatch postMessage authentication payload
  const handleIframeLoad = () => {
    setIsLoading(false);
    
    // Attempt same-origin injection of typewriter silencer script
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (iframeDoc) {
        const script = iframeDoc.createElement('script');
        script.textContent = `
          (function() {
            try {
              var isTypingSound = function(url) {
                if (!url || typeof url !== 'string') return false;
                var lower = url.toLowerCase();
                var isAudio = lower.indexOf('.mp3') !== -1 || 
                               lower.indexOf('.wav') !== -1 || 
                               lower.indexOf('.ogg') !== -1 || 
                               lower.indexOf('.aac') !== -1 || 
                               lower.indexOf('.m4a') !== -1 ||
                               lower.indexOf('sound') !== -1 ||
                               lower.indexOf('audio') !== -1;
                if (!isAudio) return false;
                if (lower.indexOf('voice') !== -1 || 
                    lower.indexOf('speech') !== -1 || 
                    lower.indexOf('speak') !== -1 || 
                    lower.indexOf('talk') !== -1 ||
                    lower.indexOf('tts') !== -1) {
                  return false;
                }
                return lower.indexOf('type') !== -1 || 
                       lower.indexOf('click') !== -1 || 
                       lower.indexOf('press') !== -1 || 
                       lower.indexOf('keyboard') !== -1 || 
                       lower.indexOf('stroke') !== -1 ||
                       lower.indexOf('write') !== -1 ||
                       lower.indexOf('machine') !== -1;
              };

              var muteIfTyping = function(element, src) {
                if (isTypingSound(src)) {
                  console.log('Muting typing sound:', src);
                  try {
                    element.muted = true;
                    element.volume = 0;
                    Object.defineProperty(element, 'volume', {
                      get: function() { return 0; },
                      set: function() {},
                      configurable: true
                    });
                    Object.defineProperty(element, 'muted', {
                      get: function() { return true; },
                      set: function() {},
                      configurable: true
                    });
                  } catch(e) {
                    console.warn('Failed to lock properties on element:', e);
                  }
                }
              };

              var OriginalAudio = window.Audio;
              if (OriginalAudio) {
                window.Audio = function(src) {
                  var audio = new OriginalAudio(src);
                  if (src) {
                    muteIfTyping(audio, src);
                  }
                  var originalSrc = src;
                  Object.defineProperty(audio, 'src', {
                    get: function() { return originalSrc; },
                    set: function(val) {
                      originalSrc = val;
                      audio.setAttribute('src', val);
                      muteIfTyping(audio, val);
                    },
                    configurable: true
                  });
                  return audio;
                };
                window.Audio.prototype = OriginalAudio.prototype;
              }

              if (window.HTMLMediaElement) {
                var descriptor = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, 'src');
                if (descriptor && descriptor.set) {
                  var originalSet = descriptor.set;
                  descriptor.set = function(val) {
                    muteIfTyping(this, val);
                    originalSet.call(this, val);
                  };
                  Object.defineProperty(window.HTMLMediaElement.prototype, 'src', descriptor);
                }
              }

              var OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
              if (OriginalAudioContext) {
                var origDecode = OriginalAudioContext.prototype.decodeAudioData;
                if (origDecode) {
                  OriginalAudioContext.prototype.decodeAudioData = function(arrayBuffer, successCallback, errorCallback) {
                    var self = this;
                    if (arrayBuffer && arrayBuffer.__isTyping) {
                      console.log('Intercepting decodeAudioData for typing sound, returning silent audio buffer.');
                      var silentBuffer = self.createBuffer(1, 100, 44100);
                      if (successCallback) successCallback(silentBuffer);
                      return Promise.resolve(silentBuffer);
                    }
                    return origDecode.apply(this, arguments);
                  };
                }
              }

              var origResponseDescriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
              if (origResponseDescriptor && origResponseDescriptor.get) {
                var origResponseGet = origResponseDescriptor.get;
                Object.defineProperty(XMLHttpRequest.prototype, 'response', {
                  get: function() {
                    var res = origResponseGet.call(this);
                    if (this.__isTyping && res) {
                      res.__isTyping = true;
                    }
                    return res;
                  },
                  configurable: true
                });
              }

              var origOpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function() {
                this.__url = arguments[1];
                this.__isTyping = isTypingSound(this.__url);
                return origOpen.apply(this, arguments);
              };

              var origFetch = window.fetch;
              window.fetch = function(input, init) {
                var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
                var isTyping = isTypingSound(url);
                var p = origFetch.apply(this, arguments);
                if (isTyping) {
                  return p.then(function(response) {
                    var origArrayBuffer = response.arrayBuffer;
                    response.arrayBuffer = function() {
                      return origArrayBuffer.apply(this, arguments).then(function(buf) {
                        if (buf) buf.__isTyping = true;
                        return buf;
                      });
                    };
                    var origBlob = response.blob;
                    response.blob = function() {
                      return origBlob.apply(this, arguments).then(function(blob) {
                        if (blob) blob.__isTyping = true;
                        return blob;
                      });
                    };
                    return response;
                  });
                }
                return p;
              };
            } catch (e) {
              console.warn('IFrame Audio intercept patch failed:', e);
            }
          })();
        `;
        iframeDoc.head.appendChild(script);
      }
    } catch (e) {
      console.warn('SashaChatPage: Cross-origin sandbox restricts direct script injection into chatbot iframe. Muting fallback operates through WebView wrapper.');
    }

    if (token && iframeRef.current?.contentWindow) {
      try {
        const authPayload = {
          type: 'auth',
          token: token,
          accessToken: token,
          access_token: token,
        };
        // Post objects and stringified versions to accommodate different potential frame message parsers
        iframeRef.current.contentWindow.postMessage(authPayload, baseChatUrl);
        iframeRef.current.contentWindow.postMessage(JSON.stringify(authPayload), baseChatUrl);
      } catch (err) {
        console.warn('SashaChatPage: Failed to dispatch postMessage auth:', err);
      }
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setReloadKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(iframeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-grow flex flex-col h-full bg-gray-50 text-gray-900 transition-all select-none">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/20">
            <Bot className="h-5.5 w-5.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[16px] text-gray-900">Sasha Assistant</h2>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Route & Repair intelligence console</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 text-gray-400 hover:text-gray-900"
            title="Reload Sasha Assistant"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenExternal}
            className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 text-gray-400 hover:text-gray-900"
            title="Open in new window"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main IFrame Viewport */}
      <div className="flex-grow relative w-full h-full overflow-hidden bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 transition-opacity duration-300">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                <Bot className="h-8 w-8 animate-bounce" />
              </div>
              <div className="absolute w-20 h-20 rounded-full border border-blue-500/20 animate-ping opacity-30"></div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 text-sm font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Connecting to Sasha AI Assistant...</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Syncing secure console session</p>
          </div>
        )}

        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={iframeUrl}
          onLoad={handleIframeLoad}
          className="w-full h-full border-0 bg-transparent"
          allow="microphone; camera; clipboard-write"
          title="Sasha AI Assistant Console"
        />
      </div>
    </div>
  );
};

export default SashaChatPage;
