import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/SiteHeader";
import { TicketPractice } from "./TicketPractice";
import "./ticket-practice.css";

export const metadata: Metadata = {
  title: "火車線上購票網站",
  description: "從二水出發，練習六步完成模擬火車票。",
};

export default function TrainTicketPage() {
  return (
    <main className="site-shell ticket-site">
      <SiteHeader />
      <TicketPractice />
    </main>
  );
}
