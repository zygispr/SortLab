import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SortLabPage } from './components/pages/SortLabPage';
import './styles/tokens.scss';
import './styles/global.scss';

const root = document.getElementById('root');
if (!root) {
  throw new Error('SortLab: #root element is missing from index.html');
}

createRoot(root).render(
  <StrictMode>
    <SortLabPage />
  </StrictMode>,
);
