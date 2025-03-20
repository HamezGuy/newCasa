'use client';

import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const hasUserDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (hasUserDismissed) {
      setIsDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler as any);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const handleInstall = (evt: React.MouseEvent) => {
    evt.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsDismissed(true); // Hide the prompt after installation
      } else {
        console.log('User dismissed the install prompt');
      }
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Save dismissal in localStorage to remember user's preference
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if not supported, already installed, or dismissed
  if (!supportsPWA || isInstalled || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 flex justify-between items-center z-50 shadow-lg border-t border-gray-200">
      <p className="text-sm sm:text-base">Install NewCasa for easy access to property listings</p>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-700 p-2"
          aria-label="Dismiss installation prompt"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button 
          onClick={handleInstall}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Install App
        </button>
      </div>
    </div>
  );
}