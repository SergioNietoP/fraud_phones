import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Loading from "./pages/Loading";
import Results from "./pages/Results";
import SponsorDropdown from "./components/SponsorDropdown";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-[#333840] flex flex-col font-sans overflow-x-hidden selection:text-white selection:bg-[#181d26]">
        <SponsorDropdown />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/loading/:phone" element={<Loading />} />
            <Route path="/results/:phone" element={<Results />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
