import LoginForm from '@/src/components/LoginForm';
import { Suspense } from 'react';

export const metadata = {
  title: 'Sign In – Student Registration Reconciliation',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
