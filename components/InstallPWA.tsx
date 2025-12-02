
import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface InstallPWAProps {
  isMobile?: boolean;
}

export const InstallPWA: React.FC<InstallPWAProps> = ({ isMobile }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || !deferredPrompt) return null;

  if (isMobile) {
    return (
      <button
        onClick={handleInstall}
        className="flex flex-col items-center justify-center w-full h-full gap-1 text-indigo-600 hover:bg-indigo-50/50"
      >
        <Download size={22} strokeWidth={2} />
        <span className="text-[10px] font-bold">Installa</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
      title="Installa applicazione"
    >
      <Download size={14} />
      Install App
    </button>
  );
};
