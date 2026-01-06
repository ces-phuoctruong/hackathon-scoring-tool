import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SchemaBuilderPage from './pages/SchemaBuilderPage';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="schemas" element={<SchemaBuilderPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="review/:id" element={<ReviewPage />} />
      </Route>
    </Routes>
  );
}

export default App;
