import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import GuideDashboard from "./pages/GuideDashboard";
import JoinTour from "./pages/JoinTour";
import PassengerView from "./pages/PassengerView";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<GuideDashboard />} />
        <Route path="/join" element={<JoinTour />} />
        <Route path="/passenger" element={<PassengerView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
