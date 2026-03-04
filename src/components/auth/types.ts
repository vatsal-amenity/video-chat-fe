export interface LoginValues {
    email: '';
    password: '';
}

export interface RegisterValues {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
    profileImage: File | null;
}

export interface ForgotPasswordValues {
    email: string;
}

export interface ResetPasswordValues {
    password: string;
    confirmPassword: string;
}

export interface VerificationValues {
    code: string;
}
