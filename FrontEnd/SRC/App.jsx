import React from 'react';
import ReactDOM from 'react-dom/client';
import { Route, HashRouter as Router } from 'react-router-dom';
import LinksSetup from './Route.jsx';

const root = ReactDOM.createRoot(document.getElementById('emp-Data'));

root.render(
  <React.StrictMode>
    <LinksSetup />
  </React.StrictMode>
);
