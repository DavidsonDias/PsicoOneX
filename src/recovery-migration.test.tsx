import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), location: { pathname: '/auth', hash: '#access_token=fake' },
  getSession: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), roles: vi.fn(),
  unsubscribe: vi.fn(), callback: undefined as any,
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useLocation: () => mocks.location }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.getSession, getUser: mocks.getUser, updateUser: mocks.updateUser, signOut: mocks.signOut,
    onAuthStateChange: (cb: any) => { mocks.callback = cb; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; } },
  from: () => ({ select: () => ({ eq: mocks.roles }) }),
} }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/auth/GoogleAuthButton', () => ({ default: () => null }));
import { useAuthRedirect } from './hooks/useAuthRedirect';
import ResetPassword from './pages/ResetPassword';
import Auth from './pages/Auth';
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.clearAllMocks(); mocks.callback = undefined;
  mocks.location = { pathname: '/auth', hash: '#access_token=fake' };
  window.history.replaceState({}, '', '/auth#access_token=fake');
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'test' } } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'test' } }, error: null });
  mocks.roles.mockResolvedValue({ data: [{ role: 'user' }] });
  mocks.updateUser.mockResolvedValue({ error: null }); mocks.signOut.mockResolvedValue({ error: null });
});
afterEach(() => cleanup());
describe('Auth redirects', () => {
  it('keeps recovery on its page after hash consumption', () => {
    mocks.location = { pathname: '/reset-password', hash: '' };
    renderHook(useAuthRedirect);
    expect(mocks.getSession).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it('routes a recovery callback to password reset', () => {
    mocks.location.hash += '&type=recovery'; renderHook(useAuthRedirect);
    expect(mocks.navigate).toHaveBeenCalledWith('/reset-password#access_token=fake&type=recovery', { replace: true });
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
  it('preserves normal login', async () => {
    renderHook(useAuthRedirect); await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  });
  it('preserves admin login', async () => {
    mocks.roles.mockResolvedValue({ data: [{ role: 'super_admin' }] });
    renderHook(useAuthRedirect); await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/super-admin', { replace: true }));
  });
  it('cancels a pending role redirect after unmount', async () => {
    let resolve: any; mocks.roles.mockReturnValue(new Promise(r => resolve = r));
    const view = renderHook(useAuthRedirect); await waitFor(() => expect(mocks.roles).toHaveBeenCalled());
    view.unmount(); resolve({ data: [] }); await Promise.resolve();
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it('cancels a pending login when recovery event arrives', async () => {
    let resolve: any; mocks.roles.mockReturnValue(new Promise(r => resolve = r));
    renderHook(useAuthRedirect); await waitFor(() => expect(mocks.roles).toHaveBeenCalled());
    mocks.callback('PASSWORD_RECOVERY'); resolve({ data: [] }); await Promise.resolve();
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith('/reset-password', { replace: true });
  });
});
describe('Password form', () => {
  it('accepts a verified session after SDK cleared the hash', async () => {
    window.history.replaceState({}, '', '/reset-password'); render(<ResetPassword />);
    expect(await screen.findByLabelText('Nova Senha')).toBeTruthy();
  });
  it('blocks an expired link even when another session exists', async () => {
    window.history.replaceState({}, '', '/reset-password#error_code=otp_expired'); render(<ResetPassword />);
    expect(await screen.findByText('Voltar para o login')).toBeTruthy();
    expect(screen.queryByLabelText('Nova Senha')).toBeNull(); expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('blocks missing sessions', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') }); render(<ResetPassword />);
    expect(await screen.findByText('Voltar para o login')).toBeTruthy(); expect(screen.queryByLabelText('Nova Senha')).toBeNull();
  });
  it('updates password and closes only the current session', async () => {
    render(<ResetPassword />);
    fireEvent.change(await screen.findByLabelText('Nova Senha'), { target: { value: 'synthetic123' } });
    fireEvent.change(screen.getByLabelText('Confirmar Senha'), { target: { value: 'synthetic123' } });
    fireEvent.click(screen.getByText('Atualizar Senha'));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' }));
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'synthetic123' });
    expect(await screen.findByText('Senha Atualizada')).toBeTruthy();
  });
});
describe('Login page callback coordination', () => {
  it('leaves recovery callbacks to the global handler', () => {
    window.history.replaceState({}, '', '/auth#access_token=fake&type=recovery');
    render(<Auth />); expect(mocks.getSession).not.toHaveBeenCalled();
  });
  it('does not redirect after leaving the login page', async () => {
    window.history.replaceState({}, '', '/auth');
    let resolve: any; mocks.roles.mockReturnValue(new Promise(r => resolve = r));
    const view = render(<Auth />); await waitFor(() => expect(mocks.roles).toHaveBeenCalled());
    view.unmount(); resolve({ data: [] }); await Promise.resolve();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
