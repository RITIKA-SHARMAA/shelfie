import type { Metadata } from "next";
import { ClientPage } from "@/components/ClientPage";

export const metadata: Metadata = { title: "Your year · Shelfie" };

export default function YearPage() {
  return <ClientPage view="year" />;
}
