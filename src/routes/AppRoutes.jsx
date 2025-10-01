import { Routes, Route, Navigate } from "react-router-dom";

import Proyecto from "../pages/components/Proyecto/Proyecto";
import ProjectDetail from "../pages/components/Proyecto/ProjectDetail";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/proyectos" replace />} />

      <Route path="/proyectos" element={<Proyecto />} />
      <Route path="/proyectos/:id" element={<ProjectDetail />} />
      <Route
        path="/proyecto/*"
        element={<Navigate to="/proyectos" replace />}
      />
      <Route path="*" element={<Navigate to="/proyectos" replace />} />
    </Routes>
  );
}
