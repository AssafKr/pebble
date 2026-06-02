import {Navigate, Route, Routes} from 'react-router-dom';
import {AppContent} from './AppContent';
import {ThemeProvider} from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/list" replace />} />
        <Route path="/:view/:issueId?" element={<AppContent />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
