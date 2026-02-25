import React from 'react';

export default function Button({
    children,
    onClick,
    disabled = false,
    variant = 'primary',
    type = 'button',
    className = ''
}) {

    const baseStyle = "px-6 py-3 rounded-xl font-bold transition-[background-color,border-color,color,fill,stroke,opacity,box-shadow,transform] duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-earth-800 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-earth-800 text-earth-100 hover:bg-earth-900",
        secondary: "bg-earth-200 text-earth-900 hover:bg-earth-300 border border-earth-300",
        danger: "bg-red-800 text-white hover:bg-red-900",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
}
