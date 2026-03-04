import React from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import Input from '../../components/auth/Input';
import { forgotPasswordSchema } from '../../components/auth/validationSchemas';

const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            title="Forgot Password?"
            subtitle="No worries, we'll send you reset instructions"
        >
            <Formik
                initialValues={{ email: '' }}
                validationSchema={forgotPasswordSchema}
                onSubmit={(values) => {
                    console.log('Forgot password values:', values);
                    // Simulate email sent and navigate to reset password (for demo purposes)
                    // In a real app, you'd wait for the email link
                    navigate('/auth/reset-password');
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <Input label="Email Address" name="email" type="email" placeholder="name@example.com" />

                        <button type="submit" disabled={isSubmitting} className="btn-primary mt-4">
                            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <Link
                            to="/auth/login"
                            className="mt-8 flex items-center justify-center text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Sign In
                        </Link>
                    </Form>
                )}
            </Formik>
        </AuthLayout>
    );
};

export default ForgotPassword;
