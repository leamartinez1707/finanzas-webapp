import Link from "next/link";
import { Logo } from "../brand";

const Header = ({
  entryHref,
  entryLabel,
  showNovedadesLink = true,
}: {
  entryHref: "/inicio" | "/ingresar";
  entryLabel: "Entrar al nido" | "Ya tengo cuenta";
  showNovedadesLink?: boolean;
}) => {
  return (
    <header className="flex items-center justify-between py-6">
      <Logo />
      <nav className="flex items-center gap-5 text-sm">
        {showNovedadesLink && (
          <Link
            href="/novedades"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Novedades
          </Link>
        )}
        <Link
          href={entryHref}
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          {entryLabel}
        </Link>
      </nav>
    </header>
  );
};

export default Header;
