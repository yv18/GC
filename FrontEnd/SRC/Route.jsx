import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import ChatApp from "./Components/Chat.jsx";



const NotFound = () => <h1>Error 404!</h1>; 

function LinksSetup() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default LinksSetup;
