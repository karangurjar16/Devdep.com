import { Button } from "@/components/ui/button";
import { API_URL } from "@/config/api";

export default function LoginButton() {
  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      Login with GitHub
    </Button>
  );
}
