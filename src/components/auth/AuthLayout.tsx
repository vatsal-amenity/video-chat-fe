import React from 'react';
import { Video } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-500/30 mb-4">
                        <Video size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
                    <p className="mt-2 text-slate-600">{subtitle}</p>
                </div>
                <div className="auth-card">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
