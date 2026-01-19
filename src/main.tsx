
import { createRoot } from 'react-dom/client'                                                                   //- Tells React where and how to start rendering your app for React 18+
import App from './App.tsx'                                                                                     //- Import the main App component
import './index.css'                                                                                            //- Import global styles applied once

/*Register service worker for Progresive Web Aplication (PWA)
 * i.e: Enable offline support, caching, and app-like behavior
 *Service workers run in the background and enable features like offline support and push notifications.
 *PWA is a website you can install, use offline, and feel like a real app.
 */
if ('serviceWorker' in navigator)                                                                               //-Check if the browser supports service workers
{
  window.addEventListener('load', () => {                                                                       //-Wait for the window to load completely
    navigator.serviceWorker.register('/sw.js')                                                                  //-Register the service worker located at /sw.js
      .then((registration) => {
        console.log('SW registered:', registration);                                                            //-Log successful registration
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);                                                   //-Go find root div in index.html and render App there



/* This file is the main entry point of the React application.
 * Where React attaches to the DOM
 * Where App is started
 */