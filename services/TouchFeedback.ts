
export const HapticFeedback = {
    light: () => {
        if (navigator.vibrate) navigator.vibrate(10);
    },
    medium: () => {
        if (navigator.vibrate) navigator.vibrate(25);
    },
    heavy: () => {
        if (navigator.vibrate) navigator.vibrate(50);
    },
    success: () => {
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    },
    error: () => {
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    },
    selection: () => {
        if (navigator.vibrate) navigator.vibrate(5);
    }
};

export const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getMobileOS = (): 'ios' | 'android' | 'other' => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'other';
};
