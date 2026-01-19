import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute, LocalRoute } from "@/components/guards";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Menu from "./pages/Menu";
import MenuBranch from "./pages/MenuBranch";
import Franquicias from "./pages/Franquicias";
import POS from "./pages/pos/POS";
import OrdersDashboard from "./pages/pos/OrdersDashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminHome from "./pages/admin/AdminHome";
import Products from "./pages/admin/Products";
import ProductForm from "./pages/admin/ProductForm";
import Branches from "./pages/admin/Branches";
import BranchProducts from "./pages/admin/BranchProducts";
import Suppliers from "./pages/admin/Suppliers";
import Users from "./pages/admin/Users";
import SalesReports from "./pages/admin/SalesReports";
import LocalLayout from "./pages/local/LocalLayout";
import LocalPedidos from "./pages/local/LocalPedidos";
import LocalProductos from "./pages/local/LocalProductos";
import LocalConfig from "./pages/local/LocalConfig";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:branchSlug" element={<MenuBranch />} />
            <Route path="/franquicias" element={<Franquicias />} />
            
            {/* POS Routes (legacy, redirect to local) */}
            <Route path="/pos" element={<LocalRoute><POS /></LocalRoute>} />
            <Route path="/pos/pedidos" element={<LocalRoute><OrdersDashboard /></LocalRoute>} />
            
            {/* Local Routes (Encargado/Operativo) */}
            <Route path="/local" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={<div />} />
            </Route>
            <Route path="/local/:branchId" element={<LocalRoute><LocalLayout /></LocalRoute>}>
              <Route index element={<LocalPedidos />} />
              <Route path="pedidos" element={<LocalPedidos />} />
              <Route path="productos" element={<LocalProductos />} />
              <Route path="config" element={<LocalConfig />} />
            </Route>
            
            {/* Admin Routes (super_admin / admin_marca) */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<AdminHome />} />
              <Route path="productos" element={<Products />} />
              <Route path="productos/nuevo" element={<ProductForm />} />
              <Route path="productos/:productId" element={<ProductForm />} />
              <Route path="sucursales" element={<Branches />} />
              <Route path="sucursales/:branchId/productos" element={<BranchProducts />} />
              <Route path="proveedores" element={<Suppliers />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="reportes" element={<SalesReports />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
