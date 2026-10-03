import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// This project is deployed as a static, local-first audit workbench.
// It intentionally creates no browser tRPC/React Query client and makes no
// background API request merely to render or edit an audit record.
createRoot(document.getElementById('root')!).render(<App />);
