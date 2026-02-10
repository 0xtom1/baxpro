import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import { PhantomProvider, darkTheme } from "@phantom/react-sdk";
import { AddressType } from "@phantom/browser-sdk";

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
import AccountSettings from "@/pages/AccountSettings";
import Alerts from "@/pages/Alerts";
import Dashboard from "@/pages/Dashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import OptInProof from "@/pages/OptInProof";
import ReadMe from "@/pages/ReadMe";
import AssetDetail from "@/pages/AssetDetail";
import AssetDetailByIdx from "@/pages/AssetDetailByIdx";
import ProductHierarchy from "@/pages/ProductHierarchy";
import VipTools from "@/pages/VipTools";
import BrandSubBrands from "@/pages/ProductHierarchy-BrandSubBrands";
import SubBrandAssets from "@/pages/ProductHierarchy-SubBrandAssets";
import Unsubscribe from "@/pages/Unsubscribe";
import Brand from "@/pages/Brand";
import BottleDetail from "@/pages/BottleDetail";
import CreateLoan from "@/pages/CreateLoan";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/notification-setup" component={NotificationSetup} />
      <Route path="/notification-settings">{() => <Redirect to="/account-settings" />}</Route>
      <Route path="/account-settings" component={AccountSettings} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/opt-in-proof" component={OptInProof} />
      <Route path="/read-me" component={ReadMe} />
      <Route path="/b/:assetId" component={AssetDetail} />
      <Route path="/asset/:assetIdx" component={AssetDetailByIdx} />
      <Route path="/vip-tools" component={VipTools} />
      <Route path="/product-hierarchy-editor" component={ProductHierarchy} />
      <Route path="/product-hierarchy-editor/brand/:brandIdx" component={BrandSubBrands} />
      <Route path="/product-hierarchy-editor/sub-brand/:subBrandIdx/assets" component={SubBrandAssets} />
      <Route path="/unsubscribe" component={Unsubscribe} />
      <Route path="/brand" component={Brand} />
      <Route path="/my-vault">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/my-vault/:assetId" component={BottleDetail} />
      <Route path="/my-bottles">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/my-bottles/:assetId" component={BottleDetail} />
      <Route path="/create-loan" component={CreateLoan} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
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

function App() {
  const phantomAppId = import.meta.env.VITE_PHANTOM_APP_ID || "";

  // If no Phantom App ID is configured, render without PhantomProvider
  // This prevents the app from crashing in environments where the SDK isn't configured
  if (!phantomAppId) {
    console.warn("VITE_PHANTOM_APP_ID not configured - Phantom wallet login disabled");
    return <AppContent />;
  }

  return (
    <PhantomProvider
      config={{
        providers: ["injected", "deeplink"],
        appId: phantomAppId,
        addressTypes: [AddressType.solana],
      }}
      theme={darkTheme}
      appName="BaxPro"
    >
      <AppContent />
    </PhantomProvider>
  );
}

export default App;
