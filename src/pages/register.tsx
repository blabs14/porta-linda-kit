import RegisterForm from '../components/auth/RegisterForm';
import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 400, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 32 }}>
        <RegisterForm />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Link to="/login" style={{ color: '#2563eb' }}>Já tenho conta</Link>
        </div>
      </div>
    </div>
  );
} 