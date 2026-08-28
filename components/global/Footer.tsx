import Link from "next/link";
import { Logo } from "../brand";

const Footer = ({
  entryHref,
  entryLabel,
}: {
  entryHref: "/inicio" | "/ingresar";
  entryLabel: "Entrar al nido" | "Ya tengo cuenta"
}) => {
  return (
    <footer className="pb-4 text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-3 border-t border-border py-8 sm:flex-row sm:justify-between">
        <Logo className="opacity-80" />

        <div className="flex items-center gap-4">
          <Link href="/novedades" className="hover:underline">
            Novedades
          </Link>
          <Link
            href={entryHref}
            className="font-medium text-foreground hover:underline"
          >
            {entryLabel}
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p>
          Desarrollador por{" "}
          <a
            className="text-green-800 hover:underline"
            href="https://leandromartinez.com.uy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leandro Martínez
          </a>
        </p>
        <p>© {new Date().getFullYear()} Nido</p>
      </div>
    </footer>
  );
};

export default Footer;
