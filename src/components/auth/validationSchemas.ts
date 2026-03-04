import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
});

export const registerSchema = Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
        .matches(/[0-9]/, 'Password must contain at least one number')
        .required('Password is required'),
    phoneNumber: Yup.string()
        .matches(/^[0-9]+$/, 'Phone number must contain only digits')
        .min(10, 'Phone number must be at least 10 digits')
        .required('Phone number is required'),
    profileImage: Yup.mixed().required('Profile image is required'),
});

export const forgotPasswordSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
});

export const resetPasswordSchema = Yup.object().shape({
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
});

export const verificationSchema = Yup.object().shape({
    code: Yup.string()
        .length(6, 'Verification code must be 6 digits')
        .matches(/^[0-9]+$/, 'Must be digits only')
        .required('Verification code is required'),
});
