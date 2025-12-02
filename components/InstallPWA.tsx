
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

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
      title="Installa applicazione"
    >
      <Download size={16} className="sm:w-[14px] sm:h-[14px]" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
};
