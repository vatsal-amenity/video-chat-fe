import React, { useCallback, useState } from 'react';
import { useFormikContext } from 'formik';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
    name: string;
    label: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ name, label }) => {
    const { setFieldValue, errors, touched } = useFormikContext<any>();
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                setFieldValue(name, file);
            };
            reader.readAsDataURL(file);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        setFieldValue(name, null);
    };

    return (
        <div className="mb-4">
            <label className="input-label">{label}</label>
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    } ${touched[name] && errors[name] ? 'border-red-500' : ''}`}
                style={{ minHeight: '120px' }}
                onClick={() => document.getElementById(name)?.click()}
            >
                <input
                    id={name}
                    name={name}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                />

                {preview ? (
                    <div className="relative w-full h-32">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                            onClick={handleClear}
                            className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded-full shadow-md text-slate-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                        <Upload className="mb-2" size={24} />
                        <p className="text-sm font-medium">Drag & drop or click to upload</p>
                        <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                    </div>
                )}
            </div>
            {touched[name] && errors[name] ? (
                <div className="error-text">{errors[name] as string}</div>
            ) : null}
        </div>
    );
};

export default ImageUpload;
