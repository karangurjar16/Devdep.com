import { Button } from "@/components/ui/button";

export default function LoginButton() {
  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/github";
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      Login with GitHub
    </Button>
  );
}
