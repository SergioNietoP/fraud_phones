import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Loading from "./pages/Loading";
import Results from "./pages/Results";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans antialiased selection:bg-emerald-500/30">
        <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,#111_0%,transparent_100%)]" />
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        <div className="relative z-10 w-full h-full min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/loading/:phone" element={<Loading />} />
            <Route path="/results/:phone" element={<Results />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
