import React from 'react';
import ReactDOM from 'react-dom/client';

import 'animal-island-ui/style';
import './styles/tokens.css';
import './styles/global.css';

import { App } from './app/App';
import './i18n';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
