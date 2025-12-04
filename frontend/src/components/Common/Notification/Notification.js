import { useEffect } from 'react';

const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.35)',
    zIndex: 2000,
};

const cardStyle = {
    minWidth: '280px',
    maxWidth: '90vw',
    background: '#fff',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
};

const titleStyle = {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: 600,
};

const messageStyle = {
    margin: '0 0 16px',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.5,
};

const buttonStyle = {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    background: '#1a3c5a',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
};

function Notification({ open, type = 'info', title, message, duration = 3000, onClose }) {
    useEffect(() => {
        if (!open || !duration) return undefined;
        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [open, duration, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div style={overlayStyle}>
            <div style={cardStyle}>
                {title && <h4 style={{ ...titleStyle, color: type === 'error' ? '#dc2626' : '#1a3c5a' }}>{title}</h4>}
                {message && <p style={messageStyle}>{message}</p>}
                {onClose && (
                    <div style={{ textAlign: 'right' }}>
                        <button type="button" style={buttonStyle} onClick={onClose}>
                            Đóng
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Notification;


