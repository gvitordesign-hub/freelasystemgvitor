export type PasswordStrength = 'Fraca' | 'Média' | 'Forte';

export interface StrengthResult {
    score: number;
    label: PasswordStrength;
    color: string;
}

export const calculatePasswordStrength = (password: string): StrengthResult => {
    let score = 0;
    if (!password) return { score: 0, label: 'Fraca', color: 'bg-slate-700' };

    // Length
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Caps at score 4 for label purposes, but we can use 0-5 for progress bar
    const normalizedScore = Math.min(score, 4);

    if (normalizedScore <= 1) {
        return { score: normalizedScore, label: 'Fraca', color: 'bg-red-500' };
    } else if (normalizedScore <= 3) {
        return { score: normalizedScore, label: 'Média', color: 'bg-yellow-500' };
    } else {
        return { score: normalizedScore, label: 'Forte', color: 'bg-green-500' };
    }
};
