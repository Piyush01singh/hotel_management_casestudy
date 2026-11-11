import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "StayWise AI — Hotel Occupancy & Room-Demand Forecasting",
  description: "Predict demand. Understand occupancy. Plan smarter. Enterprise Hospitality Intelligence Platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-slate-100 min-h-screen flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen flex flex-col bg-navy-950">
          {children}
        </div>
      </body>
    </html>
  );
}
