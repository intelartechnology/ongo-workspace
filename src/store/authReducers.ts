import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    isAuthenticated: boolean;
    user: any | null;
    token: string | null;
    loading: boolean;
}

const initialState: AuthState = {
    isAuthenticated: !!localStorage.getItem('token'),
    user: localStorage.getItem('isAuthenticated') ? JSON.parse(localStorage.getItem('isAuthenticated') as string) : null,
    token: localStorage.getItem('token'),
    loading: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        LOGIN_ACTION: (state, action: PayloadAction<any>) => {
            state.isAuthenticated = true;
            state.user = action.payload;
            state.token = action.payload.token;
            // Persistence is handled in the component usually, but we could also do it here
        },
        LOGOUT_ACTION: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('isAuthenticated');
        },
        INIT_ACTION: (state) => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('isAuthenticated');
            if (token && user) {
                state.isAuthenticated = true;
                state.user = JSON.parse(user);
                state.token = token;
            } else {
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
            }
        }
    }
});

export const { LOGIN_ACTION, LOGOUT_ACTION, INIT_ACTION } = authSlice.actions;
export default authSlice.reducer;
