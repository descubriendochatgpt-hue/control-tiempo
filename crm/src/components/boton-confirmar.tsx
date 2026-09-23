"use client";

import type { ComponentProps } from "react";

/** Botón de formulario que pide confirmación antes de enviar (para borrar, dar de baja…). */
export function BotonConfirmar({
  mensaje,
  ...props
}: ComponentProps<"button"> & { mensaje: string }) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    />
  );
}
