// Import-time client initialization must not read real environment configuration.
const blocked = () => { throw new Error("Live auth is not available in this UI fixture"); };
export const supabase = { auth: { exchangeCodeForSession: blocked, setSession: blocked, verifyOtp: blocked, updateUser: blocked } };
