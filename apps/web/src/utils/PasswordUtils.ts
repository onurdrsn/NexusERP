export class PasswordUtils {
    /**
     * Generates a secure random password satisfying complexity requirements:
     * - At least 12 characters (default)
     * - Mixed case
     * - Numbers
     * - Special characters
     */
    static generateRandom(length: number = 12): string {
        const charset = {
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lower: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        const all = Object.values(charset).join('');
        let password = '';

        // Ensure at least one of each type
        password += charset.upper[Math.floor(Math.random() * charset.upper.length)];
        password += charset.lower[Math.floor(Math.random() * charset.lower.length)];
        password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
        password += charset.special[Math.floor(Math.random() * charset.special.length)];

        for (let i = password.length; i < length; i++) {
            password += all[Math.floor(Math.random() * all.length)];
        }

        // Shuffle
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    /**
     * Validates if a password meets complexity rules:
     * - Min 8 characters
     * - At least one uppercase
     * - At least one number
     * - At least one special character
     */
    static validate(password: string): boolean {
        const minLength = 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);

        return password.length >= minLength && hasUpper && hasNumber && hasSpecial;
    }
}
