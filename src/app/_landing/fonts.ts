import { Libre_Caslon_Text } from "next/font/google";

/** The register's printed serif: titles and running heads on the landing page only. */
export const registerSerif = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-register",
});
