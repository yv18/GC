import React from "react";
import { Routes, Route, HashRouter } from "react-router-dom";
import ChatApp from "./Components/Chat.jsx";

const NotFound = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#0d0e1a] text-white text-2xl font-bold">
    404 — Page Not Found
  </div>
);

function LinksSetup() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default LinksSetup;
