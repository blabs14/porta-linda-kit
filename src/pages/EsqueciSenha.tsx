
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Recuperar Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Introduza o seu email para receber instruções de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
            <div className="flex items-center justify-center mt-6">
              <Link 
                to="/login" 
                className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-medium text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
