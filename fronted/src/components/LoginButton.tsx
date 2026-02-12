import { Button } from "@/components/ui/button";
import { API_URL } from "@/config/api";
import { Github } from "lucide-react";

export default function LoginButton() {
  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <Button
      onClick={handleLogin}
      className="w-full btn-glossy font-semibold py-6 text-base"
      size="lg"
    >
      <Github className="mr-2 h-5 w-5" />
      Continue with GitHub
    </Button>
  );
}
