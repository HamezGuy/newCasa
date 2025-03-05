// app/offline/OfflineClient.tsx
'use client';

export default function OfflineClient() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">You&apos;re offline</h1>
      <p className="mb-6">Please check your internet connection to view NewCasa property listings.</p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try Again
      </button>
    </div>
  );
}