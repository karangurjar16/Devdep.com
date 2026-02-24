import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import LoginButton from "@/components/LoginButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rocket, Sparkles, AlertCircle } from "lucide-react";
import { getMe } from "@/api/github";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Authentication failed: invalid state. Please try again.",
  missing_code: "Authentication failed: no code received from GitHub.",
  token_denied: "GitHub denied the authorization request.",
  no_token: "GitHub did not return an access token. Please try again.",
  invalid_token: "Could not verify your GitHub account. Please try again.",
  oauth_failed: "GitHub authentication failed. Please try again.",
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const errorKey = searchParams.get("error");
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? "Authentication failed. Please try again.") : null;

  // If already logged in, redirect to dashboard
  useEffect(() => {
    getMe().then((user) => {
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Login card */}
      <Card className="w-[420px] glass-strong border-white/20 relative z-10 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-gradient-primary glow-primary">
              <Rocket className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold text-white flex items-center justify-center gap-2">
              Devdep
              <Sparkles className="h-6 w-6 text-white" />
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Deploy your projects with lightning speed
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth error message */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground mb-6">
            Connect your GitHub account to get started
          </div>
          <LoginButton />
          <div className="text-center text-xs text-muted-foreground pt-4">
            By signing in, you agree to our Terms of Service
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
