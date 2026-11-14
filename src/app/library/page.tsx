import type { Metadata } from "next";
import { ClientPage } from "@/components/ClientPage";

export const metadata: Metadata = { title: "Library · Shelfie" };

export default function LibraryPage() {
  return <ClientPage view="library" />;
}
