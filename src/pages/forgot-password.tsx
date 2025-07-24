import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 400, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 32 }}>
        <ForgotPasswordForm />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Link to="/login" style={{ color: '#2563eb' }}>Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
} 