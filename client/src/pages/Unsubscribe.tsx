import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailX, CheckCircle, AlertCircle, Settings } from "lucide-react";
import GlencairnLogo from "@/components/GlencairnLogo";

export default function Unsubscribe() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const userId = params.get("uid");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!userId) {
      setStatus("error");
      setErrorMessage("Invalid unsubscribe link. Please check your email for the correct link.");
      return;
    }

    const unsubscribe = async () => {
      try {
        const response = await fetch("/api/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to unsubscribe");
        }

        setStatus("success");
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      }
    };

    unsubscribe();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-2">
          <GlencairnLogo className="w-6 h-6" />
          <span className="font-serif text-xl font-bold">BaxPro</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="max-w-md w-full">
          {status === "loading" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <MailX className="w-6 h-6 text-muted-foreground animate-pulse" />
                </div>
                <CardTitle>Unsubscribing...</CardTitle>
                <CardDescription>Please wait while we process your request.</CardDescription>
              </CardHeader>
            </>
          )}

          {status === "success" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>You've Been Unsubscribed</CardTitle>
                <CardDescription>
                  You will no longer receive email notifications from BaxPro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Changed your mind? You can re-enable email notifications anytime in your account settings.
                </p>
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => setLocation("/notification-settings")}
                    className="w-full"
                    data-testid="button-resubscribe"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Notification Settings
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="w-full"
                    data-testid="button-go-home"
                  >
                    Go to Homepage
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {status === "error" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <CardTitle>Unable to Unsubscribe</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => setLocation("/notification-settings")}
                    className="w-full"
                    data-testid="button-manage-settings"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Settings Manually
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="w-full"
                    data-testid="button-go-home-error"
                  >
                    Go to Homepage
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
