import React from 'react';
import { Formik, Form } from 'formik';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import Input from '../../components/auth/Input';
import { verificationSchema } from '../../components/auth/validationSchemas';

const EmailVerification: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            title="Verify your email"
            subtitle="We've sent a 6-digit code to your email address"
        >
            <div className="flex justify-center mb-6">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-full">
                    <Mail size={32} />
                </div>
            </div>

            <Formik
                initialValues={{ code: '' }}
                validationSchema={verificationSchema}
                onSubmit={(values) => {
                    console.log('Verification code:', values);
                    // Simulate verification success
                    navigate('/auth/login');
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <Input
                            label="Verification Code"
                            name="code"
                            placeholder="000000"
                            maxLength={6}
                            autoComplete="one-time-code"
                            className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                        />

                        <button type="submit" disabled={isSubmitting} className="btn-primary mt-4">
                            {isSubmitting ? 'Verifying...' : 'Verify Email'}
                        </button>

                        <div className="mt-8 text-center text-sm">
                            <p className="text-slate-600">Didn't receive the code?</p>
                            <button
                                type="button"
                                className="mt-1 font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                                onClick={() => console.log('Resend code')}
                            >
                                Resend Code
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </AuthLayout>
    );
};

export default EmailVerification;
