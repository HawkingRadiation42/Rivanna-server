import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import GPUStatus from './pages/GPUStatus';
import AIAssistant from './pages/AIAssistant';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="gpu-status" element={<GPUStatus />} />
          <Route path="assistant" element={<AIAssistant />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
