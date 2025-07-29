
import RegisterForm from '../components/auth/RegisterForm';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Register() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Criar Conta</CardTitle>
            <CardDescription className="text-muted-foreground">
              Junte-se à melhor plataforma de gestão financeira familiar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <div className="flex justify-center mt-6">
              <Link 
                to="/login" 
                className="text-primary hover:text-primary-dark transition-colors font-medium text-sm"
              >
                Já tenho conta
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
