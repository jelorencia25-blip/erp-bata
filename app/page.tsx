import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
  return null; // This line won't be reached, but TypeScript needs it
}