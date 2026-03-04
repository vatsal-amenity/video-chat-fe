import React from 'react';
import { Formik, Form } from 'formik';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Input from '../../components/auth/Input';
import { resetPasswordSchema } from '../../components/auth/validationSchemas';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            title="Set New Password"
            subtitle="Your new password must be different from previous passwords"
        >
            <Formik
                initialValues={{ password: '', confirmPassword: '' }}
                validationSchema={resetPasswordSchema}
                onSubmit={(values) => {
                    console.log('Reset password values:', values);
                    // Simulate password reset success
                    navigate('/auth/login');
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <Input label="New Password" name="password" type="password" placeholder="••••••••" />
                        <Input label="Confirm New Password" name="confirmPassword" type="password" placeholder="••••••••" />

                        <button type="submit" disabled={isSubmitting} className="btn-primary mt-4">
                            {isSubmitting ? 'Updating...' : 'Reset Password'}
                        </button>
                    </Form>
                )}
            </Formik>
        </AuthLayout>
    );
};

export default ResetPassword;
