// src/views/proyectos/Diagramador/SubDiagrama/ModallA.jsx
import React from "react";
import Iaclase from "../components/iaclase";

/**
 * ModallA
 * Simple wrapper que reusa el modal existente Iaclase con la misma API.
 */
export default function ModallA({ open, onClose, onSubmit }) {
  return <Iaclase open={open} onClose={onClose} onSubmit={onSubmit} />;
}
