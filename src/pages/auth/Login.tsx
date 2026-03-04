import React from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Input from '../../components/auth/Input';
import { loginSchema } from '../../components/auth/validationSchemas';

const Login: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Enter your credentials to access your account"
        >
            <Formik
                initialValues={{ email: '', password: '' }}
                validationSchema={loginSchema}
                onSubmit={(values) => {
                    console.log('Login values:', values);
                    // Simulate login and navigate to video calling page
                    navigate('/video-room');
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <Input label="Email Address" name="email" type="email" placeholder="name@example.com" />
                        <Input label="Password" name="password" type="password" placeholder="••••••••" />

                        <div className="flex items-center justify-between mb-6">
                            <label className="flex items-center text-sm text-slate-600">
                                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 mr-2" />
                                Remember me
                            </label>
                            <Link
                                to="/auth/forgot-password"
                                className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>

                        <p className="mt-8 text-center text-sm text-slate-600">
                            Don't have an account?{' '}
                            <Link
                                to="/auth/register"
                                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                            >
                                Create an account
                            </Link>
                        </p>
                    </Form>
                )}
            </Formik>
        </AuthLayout>
    );
};

export default Login;
