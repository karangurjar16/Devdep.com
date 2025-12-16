import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyProjects from "@/pages/MyProjects";
import NewProject from "@/pages/NewProject";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
         <Route path="/my-projects" element={<MyProjects />} />
          <Route
          path="/new-project/import/:owner/:repo"
          element={<NewProject />}
        />
      </Routes>
    </BrowserRouter>
  );
}
