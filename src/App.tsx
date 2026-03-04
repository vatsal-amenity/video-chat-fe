import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Login from './pages/auth/Login';
// import Register from './pages/auth/Register';
// import EmailVerification from './pages/auth/EmailVerification';
// import ForgotPassword from './pages/auth/ForgotPassword';
// import ResetPassword from './pages/auth/ResetPassword';
import VideoRoom from './pages/VideoRoom';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes
        <Route path="/auth">
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<EmailVerification />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        */}

        {/* Video Calling Route */}
        <Route path="/video-room" element={<VideoRoom />} />

        {/* Default to Video Calling directly instead of login */}
        <Route path="/" element={<VideoRoom />} />

        {/* Catch all - redirect to Video Calling */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
