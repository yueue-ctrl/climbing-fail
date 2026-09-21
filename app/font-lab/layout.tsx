import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zebba Variable Font Lab",
  description: "A three-axis testing and CSS export tool for the Zebba variable font.",
};

export default function FontLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
