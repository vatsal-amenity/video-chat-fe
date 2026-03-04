import React from 'react';
import { Formik, Form } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Input from '../../components/auth/Input';
import ImageUpload from '../../components/auth/ImageUpload';
import { registerSchema } from '../../components/auth/validationSchemas';

const Register: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Join our video chat community today"
        >
            <Formik
                initialValues={{
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    phoneNumber: '',
                    profileImage: null,
                }}
                validationSchema={registerSchema}
                onSubmit={(values) => {
                    console.log('Register values:', values);
                    // Simulate registration and move to verification
                    navigate('/auth/verify-email');
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="First Name" name="firstName" placeholder="John" />
                            <Input label="Last Name" name="lastName" placeholder="Doe" />
                        </div>

                        <Input label="Email Address" name="email" type="email" placeholder="john@example.com" />
                        <Input label="Phone Number" name="phoneNumber" type="tel" placeholder="1234567890" />
                        <Input label="Password" name="password" type="password" placeholder="••••••••" />

                        <ImageUpload name="profileImage" label="Profile Picture" />

                        <div className="flex items-start mb-6">
                            <input type="checkbox" id="terms" className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mr-2" required />
                            <label htmlFor="terms" className="text-sm text-slate-600">
                                I agree to the <Link to="#" className="text-primary-600 font-medium">Terms of Service</Link> and <Link to="#" className="text-primary-600 font-medium">Privacy Policy</Link>
                            </label>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? 'Creating account...' : 'Create Account'}
                        </button>

                        <p className="mt-8 text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link
                                to="/auth/login"
                                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                            >
                                Sign In
                            </Link>
                        </p>
                    </Form>
                )}
            </Formik>
        </AuthLayout>
    );
};

export default Register;
