import { useState, useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastProvider from "./components/ToastProvider";

/**
 * Contenido principal de la aplicación
 * Maneja el layout con Navbar y Sidebar condicionales
 */
function AppContent({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {!isLoginPage && (
        <>
          <Navbar 
            sidebarOpen={sidebarOpen} 
            onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          />
          <Sidebar 
            open={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        </>
      )}
      <div className={`pt-14 md:pt-16 transition-all duration-300 ${!isLoginPage && sidebarOpen ? 'md:ml-56' : 'ml-0'}`}>
        <AppRoutes />
      </div>
    </>
  );
}

/**
 * Componente raíz de la aplicación
 * Configura providers y estado global de la sidebar
 */
export default function App() {
  // Sidebar abierto por defecto en desktop, cerrado en móvil
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AppContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}