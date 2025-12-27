import { Button } from "@/components/ui/button";
import { SiGoogle } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AuthButtons() {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please try again",
        variant: "destructive",
      });
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <Button 
        variant="outline"
        size="lg"
        className="w-full bg-white text-black hover:bg-gray-50 border-gray-300"
        onClick={handleGoogleLogin}
        disabled={loggingIn}
        data-testid="button-google-login"
      >
        <SiGoogle className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>
    </div>
  );
}
