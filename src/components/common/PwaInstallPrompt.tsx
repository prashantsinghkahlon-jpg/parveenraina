import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  WifiOff, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallPromptProps {
  buttonClassName?: string;
  variant?: 'button' | 'banner' | 'icon';
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ 
  buttonClassName,
  variant = 'button' 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return;
      }
    }
    // Open instructions modal for iOS or manual install guidance
    setShowModal(true);
  };

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Mobile App Installed</span>
      </span>
    );
  }

  return (
    <>
      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          className={buttonClassName || "px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"}
          title="Download FieldTrack Pro PWA app on your phone"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Download Mobile App</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-3.5 rounded-2xl border border-blue-800 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black tracking-wide flex items-center gap-1.5">
                <span>Install Mobile App</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-400/30">
                  REMAIN LOGGED IN
                </span>
              </p>
              <p className="text-[11px] text-blue-200/80">
                Install directly on your phone home screen for 1-tap launch and continuous duty GPS.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      )}

      {/* Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                  FT
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Install FieldTrack Mobile App</h3>
                  <p className="text-[11px] text-slate-500">Add to your phone Home Screen (PWA)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Key Benefits */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Always Logged In</span>
                    <span className="text-[10px] text-blue-700">Never get logged out unexpectedly during duty</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-2">
                  <WifiOff className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Offline Duty Mode</span>
                    <span className="text-[10px] text-slate-600">Logs GPS updates and photos even in low signal</span>
                  </div>
                </div>
              </div>

              {/* Instructions based on OS */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>{isIos ? 'Instructions for iPhone / iPad (Safari)' : 'Instructions for Android / Chrome'}</span>
                </div>

                {isIos ? (
                  <ol className="space-y-2.5 list-decimal list-inside text-slate-700 leading-relaxed font-medium">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                      <span>Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-600" /> at bottom of Safari</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                      <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700" /></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                      <span>Tap <strong>Add</strong> in the top right corner</span>
                    </li>
                  </ol>
                ) : (
                  <ol className="space-y-2.5 list-decimal list-inside text-slate-700 leading-relaxed font-medium">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                      <span>Tap the <strong>Menu</strong> (⋮) icon in Chrome top right</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                      <span>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                      <span>Confirm <strong>Install</strong>. App icon will appear on your phone screen!</span>
                    </li>
                  </ol>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
