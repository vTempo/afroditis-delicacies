import type { Route } from "./+types/home";
import Header from "../components/utils/header";
import Footer from "../components/utils/footer";
import "../styles/home.css"

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Header />
      <main className="w-full flex-grow">

      </main>
      <Footer />
    </div>
  )
}
