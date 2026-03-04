import React, { useState } from 'react';
import { useField } from 'formik';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    name: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => {
    const [field, meta] = useField(props.name);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = props.type === 'password';

    return (
        <div className="mb-4">
            <label htmlFor={props.id || props.name} className="input-label">
                {label}
            </label>
            <div className="relative">
                <input
                    {...field}
                    {...props}
                    type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
                    className={`input-field ${meta.touched && meta.error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
            {meta.touched && meta.error ? (
                <div className="error-text">{meta.error}</div>
            ) : null}
        </div>
    );
};

export default Input;
