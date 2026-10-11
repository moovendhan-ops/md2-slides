import type { Metadata } from "next";
import { ContributorsPage } from "./contributors-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Contributors — ${BRAND.name}`,
  description: "Meet the open source creators and developers building templates and features for md2slides.",
  alternates: { canonical: "/contributors" },
};

export default function Page() {
  return <ContributorsPage />;
}
