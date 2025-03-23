import { useState, useEffect } from 'react';

export const useLocalStorage = <T>(
    key: string,
    initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? (JSON.parse(item) as T) : initialValue;
        } catch (error) {
            console.error(`Ошибка чтения localStorage для ключа "${key}":`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(`Ошибка записи в localStorage для ключа "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};
