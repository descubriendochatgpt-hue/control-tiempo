import { startTransition, type FormEvent } from "react";

/**
 * Envía un formulario sin que React lo vacíe automáticamente.
 * (Por defecto React borra los campos tras enviar, incluso si hay un error,
 * y perderías lo escrito.)
 */
export function enviarSinVaciar(
  enviar: (formData: FormData) => void,
  preparar?: (formData: FormData) => void,
) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    preparar?.(formData);
    startTransition(() => enviar(formData));
  };
}
