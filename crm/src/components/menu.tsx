"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Enlace = { href: string; texto: string };

/** Menú lateral: resalta la sección en la que estás. */
export function Menu({ enlaces }: { enlaces: Enlace[] }) {
  const ruta = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {enlaces.map(({ href, texto }) => {
        const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              activo
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
