
export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
};

export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

export const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomElement = <T>(array: T[]): T | undefined => {
    if (!array || array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
};
