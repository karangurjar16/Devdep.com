import LoginButton from "@/components/LoginButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rocket, Sparkles } from "lucide-react";

export default function Login() {
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
