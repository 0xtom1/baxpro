import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";

function ThemeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : true;
    document.documentElement.classList.toggle('dark', isDark);
  }, []);
  return null;
}
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import NotificationSetup from "@/pages/NotificationSetup";
import NotificationSettings from "@/pages/NotificationSettings";
import AccountSettings from "@/pages/AccountSettings";
import Dashboard from "@/pages/Dashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import OptInProof from "@/pages/OptInProof";
import ReadMe from "@/pages/ReadMe";
import AssetDetail from "@/pages/AssetDetail";
import AssetDetailByIdx from "@/pages/AssetDetailByIdx";
import Activity from "@/pages/Activity";
import ProductHierarchy from "@/pages/ProductHierarchy";
import VipTools from "@/pages/VipTools";
import BrandSubBrands from "@/pages/BrandSubBrands";
import SubBrandAssets from "@/pages/SubBrandAssets";
import Unsubscribe from "@/pages/Unsubscribe";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/notification-setup" component={NotificationSetup} />
      <Route path="/notification-settings" component={NotificationSettings} />
      <Route path="/account-settings" component={AccountSettings} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/opt-in-proof" component={OptInProof} />
      <Route path="/read-me" component={ReadMe} />
      <Route path="/b/:assetId" component={AssetDetail} />
      <Route path="/asset/:assetIdx" component={AssetDetailByIdx} />
      <Route path="/activity" component={Activity} />
      <Route path="/vip-tools" component={VipTools} />
      <Route path="/product-hierarchy-editor" component={ProductHierarchy} />
      <Route path="/product-hierarchy-editor/brand/:brandIdx" component={BrandSubBrands} />
      <Route path="/product-hierarchy-editor/sub-brand/:subBrandIdx/assets" component={SubBrandAssets} />
      <Route path="/unsubscribe" component={Unsubscribe} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeInitializer />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
