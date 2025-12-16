import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <Button onClick={() => navigate("/my-projects")}>
          My Projects
        </Button>
      </div>

      <div className="mt-10 text-muted-foreground">
        Welcome to your dashboard.
      </div>
    </div>
  );
}
