import LoginForm from '../components/auth/LoginForm';
import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 400, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 32 }}>
        <LoginForm />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <Link to="/register" style={{ color: '#2563eb' }}>Criar nova conta</Link>
          <Link to="/forgot-password" style={{ color: '#2563eb' }}>Recuperar password</Link>
        </div>
      </div>
    </div>
  );
} 