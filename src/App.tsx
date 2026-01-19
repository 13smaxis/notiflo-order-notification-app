
import { Toaster } from "@/components/ui/toaster"; 
import { Toaster as Sonner } from "@/components/ui/sonner";                                                     //-Renamed import to avoid conflict
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";                                       //-Provides React Query context for data fetching
import { BrowserRouter, Routes, Route } from "react-router-dom";                                                //-Routing components from React Router
import { ThemeProvider } from "@/components/theme-provider";                                                    //-Manages application themes (light/dark)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { cx } from "class-variance-authority";                                                                  //-Utility for conditional class names
import { json } from "stream/consumers";
import { jsx } from "react/jsx-runtime"; 

const queryClient = new QueryClient(); 

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>                                                                  {/* Provides React Query context */}    
      <TooltipProvider>                                                                                         {/* Provides tooltip functionality */} 
        <Toaster />
        <Sonner />                                                                                              {/* Provides toast notifications (renamed to avoid conflict)  */}  
        <BrowserRouter>
          <Routes>                                                                                              {/* Sets up application routes */}
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes> 
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

 
/* This is the main App component that sets up the application context.
 * It includes theme management, data fetching with React Query,
 * routing with React Router, and UI components like tooltips and toasters.
 */
