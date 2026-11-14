import type { Metadata } from "next";
import { ClientPage } from "@/components/ClientPage";

export const metadata: Metadata = { title: "Read next · Shelfie" };

export default function NextPage() {
  return <ClientPage view="next" />;
}
